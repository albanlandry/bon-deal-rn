/**
 * Minimal authed fetch wrapper for the FastAPI backend.
 *
 * Holds the backend JWT in a module-level variable (set by AuthContext via
 * `setAuthToken`). On a 401 it calls the registered `onUnauthorized` handler
 * once — which re-exchanges the Firebase ID token for a fresh JWT — then
 * retries the original request. Concurrent 401s share a single refresh.
 */
import { APP_VERSION } from '@/lib/appVersion';
import { reportMaintenance, reportUpdateRequired } from '@/lib/appStatus';
import { getApiUrl } from '@/utils/config';

let authToken: string | null = null;
let onUnauthorized: (() => Promise<boolean>) | null = null;
let refreshPromise: Promise<boolean> | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

export function setAuthToken(token: string | null): void {
  if (token === authToken) return;
  authToken = token;
  tokenListeners.forEach((fn) => {
    try {
      fn(token);
    } catch {
      // a listener must never break auth
    }
  });
}

/** Subscribe to access-token changes (sign-in, refresh, sign-out). */
export function subscribeAuthToken(fn: (token: string | null) => void): () => void {
  tokenListeners.add(fn);
  return () => {
    tokenListeners.delete(fn);
  };
}

/**
 * Force a token refresh through the registered unauthorized handler (the same
 * mechanism a REST 401 triggers). Concurrent callers share one refresh.
 * Resolves to whether a fresh token is now active.
 */
export function refreshAuthToken(): Promise<boolean> {
  if (!onUnauthorized) return Promise.resolve(false);
  if (!refreshPromise) {
    const handler = onUnauthorized;
    refreshPromise = handler().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(fn: (() => Promise<boolean>) | null): void {
  onUnauthorized = fn;
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip the 401 → refresh → retry behaviour (used by the refresh call itself). */
  skipUnauthorized?: boolean;
  /** Internal — marks the post-refresh retry so it can't refresh again. */
  _retry?: boolean;
}

/**
 * Machine-readable error codes the backend sends in the `X-Error-Code`
 * response header (or a `code` field in the body). Branch on these and on
 * the HTTP status, never on the (French, human) `detail` text.
 */
export type ApiErrorCode =
  // listings & uploads
  | 'photo_limit'
  | 'upload_too_large'
  | 'unsupported_image'
  | 'upload_missing'
  | 'direct_upload_unavailable'
  | 'post_has_transactions'
  | 'post_not_found'
  | 'post_unavailable'
  | 'post_not_renewable'
  | 'saved_search_limit'
  // limits & gates
  | 'rate_limited'
  | 'too_many_attempts'
  | 'maintenance'
  | 'update_required'
  // trade
  | 'user_blocked'
  | 'negotiation_not_allowed'
  | 'negotiation_exists'
  | 'negotiation_closed'
  | 'not_your_turn'
  | 'invalid_transition'
  | 'already_reviewed'
  | 'review_window_expired'
  | 'transaction_not_completed'
  // AI
  | 'ai_unavailable'
  | 'ai_rate_limited'
  | 'ai_failed'
  // sessions
  | 'session_expired'
  | 'session_invalid'
  | 'not_authenticated'
  | 'account_banned'
  // client-side: fetch rejected (offline, DNS, …)
  | 'network'
  | (string & {});

export class ApiError extends Error {
  status: number;
  /** `X-Error-Code` header, else the body's `code`; null when the server sent none. */
  code: ApiErrorCode | null;
  /** True when `message` is the server's own `detail` (not a client fallback). */
  hasDetail: boolean;
  /** Parsed JSON error body, when there was one. */
  body: any;
  constructor(status: number, message: string, code: ApiErrorCode | null = null, hasDetail = false, body: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.hasDetail = hasDetail;
    this.body = body;
  }
}

export const NETWORK_ERROR_MESSAGE = 'Connexion impossible. Vérifiez votre réseau et réessayez.';

/** The error code of a failed response: header first, then the JSON body. */
export function parseErrorCode(headers: { get(name: string): string | null } | undefined | null, body: any): string | null {
  let fromHeader: string | null = null;
  try {
    fromHeader = headers?.get?.('X-Error-Code') ?? null;
  } catch {
    fromHeader = null;
  }
  const code = (fromHeader ?? '').trim() || (typeof body?.code === 'string' ? body.code.trim() : '');
  return code || null;
}

/** FastAPI `detail`: a string, or a 422 list of `{msg}` objects. */
function detailText(detail: unknown): string | null {
  if (typeof detail === 'string') return detail.trim() || null;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d: any) => (typeof d?.msg === 'string' ? d.msg : null)).filter(Boolean);
    return msgs.length ? msgs.join(' · ') : null;
  }
  return null;
}

/** Build the ApiError for a non-OK response (exported for tests). */
export async function errorFromResponse(res: Response): Promise<ApiError> {
  let body: any = null;
  try {
    const text = await res.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null; // non-JSON / empty error body
  }
  const code = parseErrorCode(res.headers, body);
  const detail = detailText(body?.detail);
  return new ApiError(res.status, detail ?? `Erreur du serveur (${res.status})`, code, !!detail, body);
}

/**
 * What to show the user for a failed call: the server's (French) detail when
 * it sent one, else `fallback`. 5xx details are never shown (stack-ish or
 * generic text); pass a status-specific fallback instead.
 */
export function apiErrorMessage(e: unknown, fallback = 'Une erreur est survenue. Réessayez.'): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return e.message;
    if (e.hasDetail && e.status < 500) return e.message;
  }
  return fallback;
}

/** Turn ops states (maintenance, update required) into the app-wide gate. */
function reportOpsState(err: ApiError): void {
  if (err.status === 503 && err.code === 'maintenance') {
    reportMaintenance(err.hasDetail ? err.message : null);
  } else if (err.status === 426 && (err.code === 'update_required' || !err.code)) {
    reportUpdateRequired({
      message: err.hasDetail ? err.message : null,
      min_app_version: err.body?.min_app_version ?? null,
      android_store_url: err.body?.android_store_url ?? null,
      ios_store_url: err.body?.ios_store_url ?? null,
    });
  }
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipUnauthorized = false, _retry = false } = opts;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Version': APP_VERSION,
    ...headers,
  };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(getApiUrl(path), {
      method,
      headers: finalHeaders,
      body:
        body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on network failures ("Network request failed").
    throw new ApiError(0, NETWORK_ERROR_MESSAGE, 'network');
  }

  if (res.status === 401 && !_retry && !skipUnauthorized && onUnauthorized) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...opts, _retry: true });
    }
  }

  if (!res.ok) {
    const err = await errorFromResponse(res);
    reportOpsState(err);
    throw err;
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

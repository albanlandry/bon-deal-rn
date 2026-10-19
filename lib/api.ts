/**
 * Minimal authed fetch wrapper for the FastAPI backend.
 *
 * Holds the backend JWT in a module-level variable (set by AuthContext via
 * `setAuthToken`). On a 401 it calls the registered `onUnauthorized` handler
 * once — which re-exchanges the Firebase ID token for a fresh JWT — then
 * retries the original request. Concurrent 401s share a single refresh.
 */
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

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipUnauthorized = false, _retry = false } = opts;

  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...headers };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (authToken) {
    finalHeaders.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(getApiUrl(path), {
    method,
    headers: finalHeaders,
    body:
      body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && !_retry && !skipUnauthorized && onUnauthorized) {
    const refreshed = await refreshAuthToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...opts, _retry: true });
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.detail) {
        detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // non-JSON / empty error body — keep the generic message
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

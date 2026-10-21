/**
 * Realtime client for the backend's authenticated WebSocket (`/ws`).
 *
 * Protocol (JSON text frames):
 *   client → {"type":"auth","token":"<access token>"}   first frame, within 10 s
 *   server → {"type":"ready","payload":{"user_id":N}}
 *   server → {"type":"message","payload":{…ChatMessage…}}
 *   server → {"type":"ping"} every 25 s; client may send {"type":"ping"} → {"type":"pong"}
 *   close 4401 → token invalid/expired: refresh it, then reconnect.
 *
 * Messages are still SENT over REST; this socket only delivers.
 *
 * Lifecycle:
 *   - `start()` when signed in, `stop()` on sign-out.
 *   - AppState-aware: the socket is closed in the background and reopened
 *     when the app returns to the foreground.
 *   - Reconnects with exponential backoff + jitter (1 s → 30 s cap).
 *   - A liveness watchdog reconnects when no frame arrives for 60 s
 *     (the server pings every 25 s).
 *   - Reconnects with the new token whenever the access token changes.
 */
import { APP_VERSION } from '@/lib/appVersion';
import { AppState } from 'react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';
import { getAuthToken, refreshAuthToken, subscribeAuthToken } from '@/lib/api';
import { getWsUrl } from '@/utils/config';
import type { BdChatMessage } from '@/constants/types';

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'paused';

export interface RealtimeMessageEvent {
  id: number;
  conversation_id: number;
  sender_id: number | null;
  kind: BdChatMessage['kind'];
  body: string | null;
  payload: Record<string, any> | null;
  created_at: string | null;
}

type MessageListener = (m: RealtimeMessageEvent) => void;
type StatusListener = (s: RealtimeStatus) => void;
/** Fired on every successful (re)authentication — use it to resync caches. */
type ReadyListener = (info: { userId: number; reconnect: boolean }) => void;

const CLOSE_UNAUTHORIZED = 4401;
const AUTH_REPLY_TIMEOUT_MS = 12_000;
const WATCHDOG_INTERVAL_MS = 30_000;
const STALE_AFTER_MS = 60_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

/** Exponential backoff with "equal jitter": half fixed, half random. */
export function backoffDelay(attempt: number, base = BACKOFF_BASE_MS, max = BACKOFF_MAX_MS): number {
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}

const log = (...args: unknown[]) => {
  if (__DEV__) console.log('[realtime]', ...args);
};

class RealtimeClient {
  private ws: WebSocket | null = null;
  private enabled = false;
  private foreground = AppState.currentState !== 'background';
  private status: RealtimeStatus = 'idle';
  private attempt = 0;
  private everReady = false;
  private consecutiveAuthFailures = 0;
  private lastFrameAt = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private tokenUnsub: (() => void) | null = null;

  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private readyListeners = new Set<ReadyListener>();

  // ---- public API --------------------------------------------------------

  start(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.attempt = 0;
    this.consecutiveAuthFailures = 0;
    this.appStateSub = AppState.addEventListener('change', this.onAppState);
    this.tokenUnsub = subscribeAuthToken(this.onTokenChange);
    this.connect();
  }

  stop(): void {
    this.enabled = false;
    this.everReady = false;
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.tokenUnsub?.();
    this.tokenUnsub = null;
    this.teardown();
    this.setStatus('idle');
  }

  getStatus(): RealtimeStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'open';
  }

  onMessage(fn: MessageListener): () => void {
    this.messageListeners.add(fn);
    return () => {
      this.messageListeners.delete(fn);
    };
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  onReady(fn: ReadyListener): () => void {
    this.readyListeners.add(fn);
    return () => {
      this.readyListeners.delete(fn);
    };
  }

  // ---- internals ---------------------------------------------------------

  private setStatus(s: RealtimeStatus) {
    if (s === this.status) return;
    this.status = s;
    log('status', s);
    this.statusListeners.forEach((fn) => fn(s));
  }

  private onAppState = (next: AppStateStatus) => {
    const fg = next === 'active';
    if (fg === this.foreground) return;
    this.foreground = fg;
    if (!this.enabled) return;
    if (fg) {
      this.attempt = 0;
      this.connect();
    } else {
      // Pause: no socket while backgrounded (push covers that case).
      this.teardown();
      this.setStatus('paused');
    }
  };

  private onTokenChange = (token: string | null) => {
    if (!this.enabled) return;
    if (!token) {
      this.teardown();
      this.setStatus('reconnecting');
      return;
    }
    // New token (refresh or re-login): re-authenticate with it. The 4401
    // failure counter is only reset by a successful `ready`.
    this.attempt = 0;
    this.connect();
  };

  private clearTimers() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.authTimer) clearTimeout(this.authTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.reconnectTimer = null;
    this.authTimer = null;
    this.watchdog = null;
  }

  /** Close the current socket without triggering a reconnect. */
  private teardown() {
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close(1000, 'client');
      } catch {
        // ignore
      }
    }
  }

  private connect() {
    if (!this.enabled || !this.foreground) return;
    this.teardown();
    const token = getAuthToken();
    if (!token) {
      // Wait for the token listener to fire after sign-in / refresh.
      this.setStatus('reconnecting');
      return;
    }
    this.setStatus(this.everReady ? 'reconnecting' : 'connecting');

    let ws: WebSocket;
    try {
      // RN's WebSocket takes extra handshake headers (non-standard 3rd arg).
      ws = new (WebSocket as any)(getWsUrl(), null, { headers: { 'X-App-Version': APP_VERSION } }) as WebSocket;
    } catch (e) {
      log('constructor failed', e);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      ws.send(JSON.stringify({ type: 'auth', token }));
      this.authTimer = setTimeout(() => {
        if (this.ws === ws && this.status !== 'open') {
          log('no ready frame — retrying');
          this.teardown();
          this.scheduleReconnect();
        }
      }, AUTH_REPLY_TIMEOUT_MS);
    };

    ws.onmessage = (ev: WebSocketMessageEvent) => {
      if (this.ws !== ws) return;
      this.lastFrameAt = Date.now();
      let frame: any;
      try {
        frame = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
      } catch {
        return;
      }
      switch (frame?.type) {
        case 'ready': {
          if (this.authTimer) clearTimeout(this.authTimer);
          this.authTimer = null;
          const reconnect = this.everReady;
          this.everReady = true;
          this.attempt = 0;
          this.consecutiveAuthFailures = 0;
          this.startWatchdog(ws);
          this.setStatus('open');
          const userId = Number(frame.payload?.user_id);
          this.readyListeners.forEach((fn) => fn({ userId, reconnect }));
          break;
        }
        case 'message':
          if (frame.payload && typeof frame.payload.id === 'number') {
            const m = frame.payload as RealtimeMessageEvent;
            this.messageListeners.forEach((fn) => {
              try {
                fn(m);
              } catch (e) {
                log('listener error', e);
              }
            });
          }
          break;
        case 'ping':
        case 'pong':
        default:
          break; // liveness only (lastFrameAt updated above)
      }
    };

    ws.onerror = () => {
      // onclose follows; nothing to do here.
    };

    ws.onclose = (ev: WebSocketCloseEvent) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.clearTimers();
      if (!this.enabled || !this.foreground) return;
      log('closed', ev.code, ev.reason);
      if (ev.code === CLOSE_UNAUTHORIZED) {
        this.handleUnauthorized();
      } else {
        this.scheduleReconnect();
      }
    };
  }

  private async handleUnauthorized() {
    this.setStatus('reconnecting');
    this.consecutiveAuthFailures += 1;
    // A refresh that immediately yields another 4401 must not loop hot.
    if (this.consecutiveAuthFailures > 3) {
      this.scheduleReconnect();
      return;
    }
    const before = getAuthToken();
    const ok = await refreshAuthToken();
    if (!this.enabled) return;
    if (!ok) {
      this.scheduleReconnect();
      return;
    }
    // If the token changed, onTokenChange already reconnected.
    if (getAuthToken() === before) this.connect();
  }

  private scheduleReconnect() {
    if (!this.enabled || !this.foreground) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = backoffDelay(this.attempt);
    this.attempt = Math.min(this.attempt + 1, 10);
    this.setStatus('reconnecting');
    log(`reconnect in ${delay} ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startWatchdog(ws: WebSocket) {
    if (this.watchdog) clearInterval(this.watchdog);
    this.lastFrameAt = Date.now();
    this.watchdog = setInterval(() => {
      if (this.ws !== ws) return;
      if (Date.now() - this.lastFrameAt > STALE_AFTER_MS) {
        log('stale connection — reconnecting');
        this.teardown();
        this.scheduleReconnect();
        return;
      }
      try {
        ws.send(JSON.stringify({ type: 'ping' }));
      } catch {
        // onclose will handle it
      }
    }, WATCHDOG_INTERVAL_MS);
  }
}

export const realtime = new RealtimeClient();

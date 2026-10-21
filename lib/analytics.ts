/**
 * Product analytics: a small batched client for POST /events (docs/08 §B).
 *
 * - Opt-in only (doc 06 §2: no tracking by default). Nothing is queued or
 *   sent until the user turns on "Statistiques d'utilisation" in
 *   Confidentialité; turning it off clears the queue and the anonymous id.
 * - Events are queued in memory and mirrored to AsyncStorage, and flushed
 *   every 15 s, when the app goes to the background, and as soon as 20 are
 *   waiting. At most 50 per call (the server's cap).
 * - A 4xx answer drops the batch (it will never be accepted; 408/429 are
 *   retried); network errors and 5xx keep it for the next flush.
 * - Props are ids, enums and counts only: never text the user typed.
 *
 * The server already records contact_seller, make_offer, sale_completed and
 * listing_published; don't send those from the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import type { NativeEventSubscription } from 'react-native';
import { ApiError, apiFetch } from '@/lib/api';
import { APP_VERSION } from '@/lib/appVersion';

export type AnalyticsEventName =
  | 'app_open'
  | 'view_item'
  | 'search'
  | 'share_item'
  | 'save_search'
  | 'start_listing'
  | 'photo_added'
  | 'filter_used';

export type AnalyticsProps = Record<string, string | number | boolean | null | (string | number)[]>;

export interface QueuedEvent {
  name: string;
  props?: AnalyticsProps;
  anonymous_id?: string;
  ts: string;
}

export type SendResult = 'ok' | 'drop' | 'retry';
export type Transport = (events: QueuedEvent[]) => Promise<SendResult>;

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const STORAGE_KEYS = {
  queue: 'bondeal.analytics.queue.v1',
  anonymousId: 'bondeal.analytics.anon_id.v1',
  consent: 'bondeal.analytics.consent.v1',
} as const;

export const MAX_BATCH = 50;
export const FLUSH_AT = 20;
export const FLUSH_INTERVAL_MS = 15_000;
/** Hard cap on what we keep while offline (oldest dropped first). */
export const MAX_QUEUE = 500;

const NAME_RE = /^[a-z][a-z0-9_]{1,59}$/;

/** Send a batch with the shared API client (Bearer when signed in). */
export const apiTransport: Transport = async (events) => {
  try {
    await apiFetch('/events', {
      method: 'POST',
      body: { events, platform: Platform.OS, app_version: APP_VERSION },
      skipUnauthorized: true,
    });
    return 'ok';
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
      return 'drop';
    }
    return 'retry';
  }
};

function randomId(): string {
  // RFC 4122 v4 shape; not security-sensitive (an analytics pseudonym).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface AnalyticsOptions {
  transport?: Transport;
  storage?: KeyValueStorage;
  now?: () => Date;
  flushAt?: number;
  maxBatch?: number;
}

export class AnalyticsClient {
  private queue: QueuedEvent[] = [];
  private enabled = false;
  private anonymousId: string | null = null;
  private loaded: Promise<void> | null = null;
  private flushing: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  /** After a failed send, size-triggered flushes wait for the next interval. */
  private backoffUntil = 0;
  private readonly transport: Transport;
  private readonly storage: KeyValueStorage;
  private readonly now: () => Date;
  private readonly flushAt: number;
  private readonly maxBatch: number;

  constructor(opts: AnalyticsOptions = {}) {
    this.transport = opts.transport ?? apiTransport;
    this.storage = opts.storage ?? AsyncStorage;
    this.now = opts.now ?? (() => new Date());
    this.flushAt = opts.flushAt ?? FLUSH_AT;
    this.maxBatch = Math.min(opts.maxBatch ?? MAX_BATCH, MAX_BATCH);
  }

  /** Load consent, the anonymous id and any events persisted by a previous run. */
  load(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        try {
          const [consent, anon, saved] = await Promise.all([
            this.storage.getItem(STORAGE_KEYS.consent),
            this.storage.getItem(STORAGE_KEYS.anonymousId),
            this.storage.getItem(STORAGE_KEYS.queue),
          ]);
          this.enabled = consent === '1';
          this.anonymousId = anon;
          const parsed = saved ? JSON.parse(saved) : [];
          if (this.enabled && Array.isArray(parsed)) this.queue = [...parsed, ...this.queue].slice(-MAX_QUEUE);
        } catch {
          // storage unavailable: run in memory only
        }
      })();
    }
    return this.loaded;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  get size(): number {
    return this.queue.length;
  }

  /** Turn collection on (user opt-in) or off (clears everything). */
  async setEnabled(on: boolean): Promise<void> {
    await this.load();
    this.enabled = on;
    try {
      await this.storage.setItem(STORAGE_KEYS.consent, on ? '1' : '0');
      if (!on) {
        this.queue = [];
        this.anonymousId = null;
        await Promise.all([
          this.storage.removeItem(STORAGE_KEYS.queue),
          this.storage.removeItem(STORAGE_KEYS.anonymousId),
        ]);
      }
    } catch {
      // best-effort
    }
  }

  private async ensureAnonymousId(): Promise<string> {
    if (!this.anonymousId) {
      this.anonymousId = randomId();
      this.storage.setItem(STORAGE_KEYS.anonymousId, this.anonymousId).catch(() => {});
    }
    return this.anonymousId;
  }

  private persist(): void {
    this.storage.setItem(STORAGE_KEYS.queue, JSON.stringify(this.queue)).catch(() => {});
  }

  /** Queue an event (no-op without consent). Flushes when the batch is full. */
  async track(name: AnalyticsEventName | string, props?: AnalyticsProps): Promise<void> {
    await this.load();
    if (!this.enabled || !NAME_RE.test(name)) return;
    const anonymous_id = await this.ensureAnonymousId();
    this.queue.push({ name, ...(props ? { props } : null), anonymous_id, ts: this.now().toISOString() });
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    this.persist();
    if (this.queue.length >= this.flushAt && this.now().getTime() >= this.backoffUntil) await this.flush();
  }

  /** Send everything queued, in batches of ≤ 50. Concurrent calls share one run. */
  flush(): Promise<void> {
    if (!this.flushing) {
      this.flushing = this.doFlush().finally(() => {
        this.flushing = null;
      });
    }
    return this.flushing;
  }

  private async doFlush(): Promise<void> {
    await this.load();
    if (!this.enabled) return;
    // Bounded loop: one pass over what's queued now.
    let rounds = Math.ceil(this.queue.length / this.maxBatch);
    while (this.queue.length > 0 && rounds-- > 0) {
      const batch = this.queue.slice(0, this.maxBatch);
      let result: SendResult;
      try {
        result = await this.transport(batch);
      } catch {
        result = 'retry';
      }
      if (result === 'retry') {
        // keep it; try again on the next timer / background flush
        this.backoffUntil = this.now().getTime() + FLUSH_INTERVAL_MS;
        break;
      }
      this.backoffUntil = 0;
      // 'ok' or 'drop': remove exactly the events that were sent.
      this.queue.splice(0, batch.length);
      this.persist();
    }
  }

  /** Start the 15 s timer and the flush-on-background listener (app runtime only). */
  start(): void {
    if (this.timer) return;
    this.load();
    this.timer = setInterval(() => {
      if (this.queue.length) this.flush();
    }, FLUSH_INTERVAL_MS);
    this.appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') this.flush();
    });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.appStateSub?.remove();
    this.appStateSub = null;
  }
}

export const analytics = new AnalyticsClient();

/** Fire-and-forget helper for screens. */
export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  analytics.track(name, props).catch(() => {});
}

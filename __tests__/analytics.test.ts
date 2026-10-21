jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { AnalyticsClient, apiTransport, KeyValueStorage, QueuedEvent, SendResult, STORAGE_KEYS } from '@/lib/analytics';
import { setAuthToken } from '@/lib/api';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => (k in data ? data[k] : null),
    setItem: async (k, v) => {
      data[k] = v;
    },
    removeItem: async (k) => {
      delete data[k];
    },
  };
}

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

function setup(results: SendResult[] = [], opts: { consent?: boolean; stored?: Record<string, string> } = {}) {
  const storage = memoryStorage({
    ...(opts.consent === false ? {} : { [STORAGE_KEYS.consent]: '1' }),
    ...opts.stored,
  });
  const batches: QueuedEvent[][] = [];
  const transport = jest.fn(async (events: QueuedEvent[]) => {
    batches.push(events);
    return results.length ? results.shift()! : 'ok';
  });
  const client = new AnalyticsClient({ transport, storage, now: () => new Date('2026-10-20T10:00:00Z') });
  return { client, storage, transport, batches };
}

describe('analytics queue', () => {
  it('does nothing without consent (default off)', async () => {
    const { client, transport, storage } = setup([], { consent: false });
    await client.track('view_item', { post_id: 1 });
    await client.flush();
    expect(client.isEnabled()).toBe(false);
    expect(client.size).toBe(0);
    expect(transport).not.toHaveBeenCalled();
    expect(storage.data[STORAGE_KEYS.queue]).toBeUndefined();
  });

  it('queues with an anonymous id and timestamp, and persists the queue', async () => {
    const { client, storage, transport } = setup();
    await client.track('view_item', { post_id: 7, category: 'electronique' });
    expect(transport).not.toHaveBeenCalled();
    expect(client.size).toBe(1);
    const saved = JSON.parse(storage.data[STORAGE_KEYS.queue]);
    expect(saved[0]).toMatchObject({
      name: 'view_item',
      props: { post_id: 7, category: 'electronique' },
      ts: '2026-10-20T10:00:00.000Z',
    });
    expect(saved[0].anonymous_id).toBe(storage.data[STORAGE_KEYS.anonymousId]);
    expect(saved[0].anonymous_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('flushes automatically once 20 events are waiting', async () => {
    const { client, batches } = setup();
    for (let i = 0; i < 19; i++) await client.track('filter_used', { count: i });
    expect(batches).toHaveLength(0);
    await client.track('filter_used', { count: 19 });
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(20);
    expect(client.size).toBe(0);
  });

  it('sends at most 50 events per call', async () => {
    const stored = Array.from({ length: 120 }, (_, i) => ({ name: 'search', ts: `t${i}` }));
    const { client, batches } = setup([], { stored: { [STORAGE_KEYS.queue]: JSON.stringify(stored) } });
    await client.load();
    expect(client.size).toBe(120);
    await client.flush();
    expect(batches.map((b) => b.length)).toEqual([50, 50, 20]);
    expect(client.size).toBe(0);
  });

  it('drops a batch the server rejects with a 4xx', async () => {
    const { client, batches, storage } = setup(['drop']);
    await client.track('search', { has_query: true });
    await client.flush();
    expect(batches).toHaveLength(1);
    expect(client.size).toBe(0);
    expect(JSON.parse(storage.data[STORAGE_KEYS.queue])).toEqual([]);
  });

  it('keeps the batch on network errors and retries on the next flush', async () => {
    const { client, batches } = setup(['retry', 'ok']);
    await client.track('share_item', { post_id: 3 });
    await client.flush();
    expect(client.size).toBe(1);
    await client.flush();
    expect(batches).toHaveLength(2);
    expect(batches[1][0].name).toBe('share_item');
    expect(client.size).toBe(0);
  });

  it('treats a throwing transport as a retry', async () => {
    const storage = memoryStorage({ [STORAGE_KEYS.consent]: '1' });
    const client = new AnalyticsClient({
      storage,
      transport: async () => {
        throw new Error('boom');
      },
    });
    await client.track('app_open');
    await client.flush();
    expect(client.size).toBe(1);
  });

  it('only removes the events that were sent (new ones stay queued)', async () => {
    let release!: (r: SendResult) => void;
    const storage = memoryStorage({ [STORAGE_KEYS.consent]: '1' });
    const client = new AnalyticsClient({ storage, transport: () => new Promise((r) => (release = r)) });
    await client.track('app_open');
    const flushing = client.flush();
    await flushPromises();
    await client.track('view_item', { post_id: 1 });
    release('ok');
    await flushing;
    expect(client.size).toBe(1);
  });

  it('opting out clears the queue and the anonymous id', async () => {
    const { client, storage } = setup();
    await client.track('app_open');
    await client.setEnabled(false);
    expect(client.size).toBe(0);
    expect(storage.data[STORAGE_KEYS.consent]).toBe('0');
    expect(storage.data[STORAGE_KEYS.queue]).toBeUndefined();
    expect(storage.data[STORAGE_KEYS.anonymousId]).toBeUndefined();
    await client.track('app_open');
    expect(client.size).toBe(0);
  });

  it('ignores invalid event names', async () => {
    const { client } = setup();
    await client.track('View Item');
    expect(client.size).toBe(0);
  });
});

describe('apiTransport', () => {
  const fetchMock = jest.fn();
  const reply = (status: number) =>
    ({ status, ok: status < 400, headers: { get: () => null }, text: async () => '{}' }) as unknown as Response;
  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    setAuthToken(null);
  });
  const ev: QueuedEvent[] = [{ name: 'app_open', ts: '2026-10-20T10:00:00Z' }];

  it('posts the batch with platform and app_version', async () => {
    fetchMock.mockResolvedValueOnce(reply(202));
    await expect(apiTransport(ev)).resolves.toBe('ok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/events$/);
    const body = JSON.parse(init.body);
    expect(body.events).toEqual(ev);
    expect(body.platform).toBeTruthy();
    expect(body.app_version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('drops on 4xx, retries on 429, 5xx and network errors', async () => {
    fetchMock.mockResolvedValueOnce(reply(422));
    await expect(apiTransport(ev)).resolves.toBe('drop');
    fetchMock.mockResolvedValueOnce(reply(429));
    await expect(apiTransport(ev)).resolves.toBe('retry');
    fetchMock.mockResolvedValueOnce(reply(500));
    await expect(apiTransport(ev)).resolves.toBe('retry');
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(apiTransport(ev)).resolves.toBe('retry');
  });
});

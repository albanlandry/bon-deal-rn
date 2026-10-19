import { ApiError, apiFetch, setAuthToken, setUnauthorizedHandler } from '@/lib/api';

const json = (status: number, body: unknown) =>
  ({ status, ok: status < 400, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

describe('apiFetch', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    setAuthToken('old-token');
    setUnauthorizedHandler(null);
  });

  it('sends the bearer token and parses JSON', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: 1 }));
    await expect(apiFetch('/auth/me')).resolves.toEqual({ ok: 1 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer old-token');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    setUnauthorizedHandler(async () => {
      setAuthToken('new-token');
      return true;
    });
    fetchMock.mockResolvedValueOnce(json(401, { detail: 'expired' })).mockResolvedValueOnce(json(200, { ok: 2 }));
    await expect(apiFetch('/posts')).resolves.toEqual({ ok: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new-token');
  });

  it("doesn't loop when the refresh fails", async () => {
    setUnauthorizedHandler(async () => false);
    fetchMock.mockResolvedValue(json(401, { detail: 'Non authentifié' }));
    await expect(apiFetch('/posts')).rejects.toMatchObject({ status: 401, message: 'Non authentifié' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns error bodies into ApiError with the server detail', async () => {
    fetchMock.mockResolvedValueOnce(json(409, { detail: 'Déjà signalé' }));
    const err = await apiFetch('/reports', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.message).toBe('Déjà signalé');
  });
});

import { ApiError, apiErrorMessage, apiFetch, parseErrorCode, setAuthToken, setUnauthorizedHandler } from '@/lib/api';
import { clearMaintenance, clearUpdateRequired, getAppStatus } from '@/lib/appStatus';
import { blockedMessage } from '@/lib/api/safety';

const headers = (h: Record<string, string>) => ({
  get: (name: string) => {
    const k = Object.keys(h).find((key) => key.toLowerCase() === name.toLowerCase());
    return k ? h[k] : null;
  },
});
const res = (status: number, body: unknown, h: Record<string, string> = {}) =>
  ({
    status,
    ok: status < 400,
    headers: headers(h),
    json: async () => body,
    text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
  }) as unknown as Response;

describe('ApiError.code', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    setAuthToken(null);
    setUnauthorizedHandler(null);
    clearMaintenance();
    clearUpdateRequired();
  });

  it('reads X-Error-Code from the response headers', async () => {
    fetchMock.mockResolvedValueOnce(res(400, { detail: 'Vous avez déjà 5 photos.' }, { 'X-Error-Code': 'photo_limit' }));
    const err: ApiError = await apiFetch('/posts/1/images', { method: 'POST' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('photo_limit');
    expect(err.message).toBe('Vous avez déjà 5 photos.');
    expect(err.hasDetail).toBe(true);
  });

  it('falls back to the body code, header wins when both exist', () => {
    expect(parseErrorCode(headers({}), { code: 'maintenance' })).toBe('maintenance');
    expect(parseErrorCode(headers({ 'x-error-code': 'rate_limited' }), { code: 'other' })).toBe('rate_limited');
    expect(parseErrorCode(undefined, { detail: 'x' })).toBeNull();
    expect(parseErrorCode(headers({ 'X-Error-Code': '  ' }), null)).toBeNull();
  });

  it('has a null code and a French fallback for bare errors', async () => {
    fetchMock.mockResolvedValueOnce(res(500, 'Internal Server Error'));
    const err: ApiError = await apiFetch('/posts').catch((e) => e);
    expect(err.code).toBeNull();
    expect(err.hasDetail).toBe(false);
    expect(err.message).toBe('Erreur du serveur (500)');
    expect(apiErrorMessage(err, 'Réessayez.')).toBe('Réessayez.');
  });

  it('joins 422 validation messages', async () => {
    fetchMock.mockResolvedValueOnce(res(422, { detail: [{ msg: 'Champ requis' }, { msg: 'Trop long' }] }));
    const err: ApiError = await apiFetch('/posts', { method: 'POST', body: {} }).catch((e) => e);
    expect(err.message).toBe('Champ requis · Trop long');
  });

  it('turns network failures into a French ApiError with status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const err: ApiError = await apiFetch('/posts').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.code).toBe('network');
    expect(err.message).not.toMatch(/network/i);
  });

  it('sends X-App-Version on every request', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { ok: 1 }));
    await apiFetch('/geo/countries');
    expect(fetchMock.mock.calls[0][1].headers['X-App-Version']).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('switches the app to maintenance on 503 code=maintenance', async () => {
    fetchMock.mockResolvedValueOnce(
      res(503, { detail: 'Maintenance en cours', code: 'maintenance' }, { 'X-Error-Code': 'maintenance' }),
    );
    await apiFetch('/posts').catch(() => {});
    expect(getAppStatus().maintenance).toEqual({ message: 'Maintenance en cours' });
  });

  it('a plain 503 is not maintenance', async () => {
    fetchMock.mockResolvedValueOnce(res(503, { detail: 'IA indisponible' }));
    await apiFetch('/ai/suggest').catch(() => {});
    expect(getAppStatus().maintenance).toBeNull();
  });

  it('switches to "update required" on 426 with the store URLs', async () => {
    fetchMock.mockResolvedValueOnce(
      res(426, {
        detail: 'Mettez à jour',
        code: 'update_required',
        min_app_version: '9.0.0',
        android_store_url: 'https://play.example/app',
        ios_store_url: null,
      }),
    );
    await apiFetch('/posts').catch(() => {});
    expect(getAppStatus().updateRequired).toMatchObject({
      message: 'Mettez à jour',
      min_app_version: '9.0.0',
      android_store_url: 'https://play.example/app',
    });
  });

  it('blockedMessage branches on the code, not the text', () => {
    const blocked = new ApiError(403, 'Vous ne pouvez pas contacter cet utilisateur.', 'user_blocked', true);
    const other = new ApiError(403, "Vous n'êtes pas autorisé à effectuer cette action", 'forbidden', true);
    const uncoded = new ApiError(403, 'Vous ne pouvez pas contacter cet utilisateur.', null, true);
    expect(blockedMessage(blocked)).toBe('Vous ne pouvez pas contacter cet utilisateur.');
    expect(blockedMessage(other)).toBeNull();
    // Same text without the code is not treated as a block: never branch on text.
    expect(blockedMessage(uncoded)).toBeNull();
    expect(blockedMessage(new ApiError(404, 'Introuvable', null, true))).toBeNull();
  });
});

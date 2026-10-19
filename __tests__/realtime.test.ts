import { backoffDelay } from '@/lib/realtime';

it('backs off exponentially with jitter, capped at 30 s', () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const exp = Math.min(30_000, 1000 * 2 ** attempt);
    for (let i = 0; i < 20; i += 1) {
      const d = backoffDelay(attempt);
      expect(d).toBeGreaterThanOrEqual(exp / 2);
      expect(d).toBeLessThanOrEqual(exp);
    }
  }
});

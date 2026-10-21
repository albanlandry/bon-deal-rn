/**
 * Tiny version comparison for the update gate (no dependency).
 *
 * Mirrors the backend's parser (ops/maintenance.py `parse_version`):
 * "1.4.2" → [1, 4, 2], "2.0" → [2, 0, 0], "v3" → [3, 0, 0]. Anything after
 * the numeric core ("1.2.3-beta.1", "1.2.3+45") is ignored, as on the server.
 * Unparseable input gives null, and callers then fail open: a bad setting must
 * never lock users out of the app.
 */
export type Version = [number, number, number];

const VERSION_RE = /^\s*v?(\d{1,4})(?:\.(\d{1,4}))?(?:\.(\d{1,4}))?/;

export function parseVersion(value: string | null | undefined): Version | null {
  const m = VERSION_RE.exec(value ?? '');
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

/** -1 when a < b, 0 when equal, 1 when a > b; null if either is unparseable. */
export function compareVersions(a: string | null | undefined, b: string | null | undefined): -1 | 0 | 1 | null {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return null;
  for (let i = 0; i < 3; i++) {
    if (va[i] !== vb[i]) return va[i] < vb[i] ? -1 : 1;
  }
  return 0;
}

/** True only when both parse and `current` is strictly below `target`. */
export function isVersionBelow(current: string | null | undefined, target: string | null | undefined): boolean {
  return compareVersions(current, target) === -1;
}

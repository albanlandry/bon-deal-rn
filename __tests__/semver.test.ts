import { compareVersions, isVersionBelow, parseVersion } from '@/lib/semver';

describe('semver helper', () => {
  it('parses full, partial and prefixed versions like the backend', () => {
    expect(parseVersion('1.4.2')).toEqual([1, 4, 2]);
    expect(parseVersion('2.0')).toEqual([2, 0, 0]);
    expect(parseVersion('v3')).toEqual([3, 0, 0]);
    expect(parseVersion(' 1.2.3-beta.1')).toEqual([1, 2, 3]);
    expect(parseVersion('1.2.3+45')).toEqual([1, 2, 3]);
  });

  it('returns null for unparseable input', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion(null)).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
    expect(parseVersion('latest')).toBeNull();
  });

  it('compares numerically, not lexically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.9.9', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0.0', '10.0.0')).toBe(-1);
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  });

  it('fails open: unknown versions are never "below"', () => {
    expect(compareVersions('1.0.0', 'garbage')).toBeNull();
    expect(isVersionBelow('1.0.0', null)).toBe(false);
    expect(isVersionBelow('1.0.0', '')).toBe(false);
    expect(isVersionBelow(undefined, '2.0.0')).toBe(false);
  });

  it('isVersionBelow is strict', () => {
    expect(isVersionBelow('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelow('1.0.0', '1.0.0')).toBe(false);
    expect(isVersionBelow('1.2.0', '1.1.9')).toBe(false);
  });
});

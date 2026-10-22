jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import { normalizeDraftStep, SELL_STEP_COUNT } from '@/lib/sellDraft';

describe('normalizeDraftStep', () => {
  it('maps drafts from the 4-step flow onto the 3 steps', () => {
    expect(SELL_STEP_COUNT).toBe(3);
    expect([0, 1, 2, 3].map((s) => normalizeDraftStep(s, undefined))).toEqual([0, 1, 1, 2]);
  });

  it('keeps 3-step drafts and clamps bad values', () => {
    expect(normalizeDraftStep(2, 2)).toBe(2);
    expect(normalizeDraftStep(9, 2)).toBe(2);
    expect(normalizeDraftStep(-1, 2)).toBe(0);
    expect(normalizeDraftStep('x', undefined)).toBe(0);
  });
});

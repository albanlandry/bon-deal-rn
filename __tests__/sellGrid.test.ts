import { dropIndex, moveItem, priceScale, pricePresets } from '@/components/molecules/sellGrid';

describe('sell photo grid reorder', () => {
  // 3 columns, 100 px cells + 8 px gap
  const step = 108;
  it('lands on the slot under the dragged tile', () => {
    expect(dropIndex(0, 110, 0, 3, step, step, 5)).toBe(1);
    expect(dropIndex(0, 220, 110, 3, step, step, 5)).toBe(4); // clamped to last photo
    expect(dropIndex(4, -110, -110, 3, step, step, 5)).toBe(0);
    expect(dropIndex(2, 20, 10, 3, step, step, 5)).toBe(2);
  });
  it('clamps outside the grid and handles bad input', () => {
    expect(dropIndex(1, -999, -999, 3, step, step, 5)).toBe(0);
    expect(dropIndex(1, 999, 999, 3, step, step, 5)).toBe(4);
    expect(dropIndex(1, 50, 0, 3, 0, step, 5)).toBe(1);
  });
  it('moves an item without mutating', () => {
    const l = ['a', 'b', 'c', 'd'];
    expect(moveItem(l, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(l, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(l, 1, 1)).toBe(l);
    expect(l).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('price range bar', () => {
  it('puts the comparables range in the middle half', () => {
    const s = priceScale(10000, 20000);
    expect(s.pos(10000)).toBeCloseTo(0.25);
    expect(s.pos(20000)).toBeCloseTo(0.75);
    expect(s.pos(15000)).toBeCloseTo(0.5);
    expect(s.pos(0)).toBe(0);
    expect(s.pos(1e9)).toBe(1);
  });
  it('handles a single-value range', () => {
    const s = priceScale(5000, 5000);
    expect(s.pos(5000)).toBeGreaterThan(0);
    expect(s.pos(5000)).toBeLessThan(1);
  });
  it('builds rounded unique presets', () => {
    expect(pricePresets(9800, 12400, 15100)).toEqual([10000, 12500, 15000]);
    expect(pricePresets(null, 12000, 12100)).toEqual([12000]);
    expect(pricePresets(null, null, null)).toEqual([]);
  });
});

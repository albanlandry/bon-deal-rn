/**
 * Pure helpers for the Sell flow (no React Native imports, unit-tested):
 * photo-grid drag-to-reorder maths and the price-range bar scale.
 */

/** Slot a tile dragged from `from` by (dx, dy) lands on, clamped to [0, count). */
export function dropIndex(
  from: number,
  dx: number,
  dy: number,
  cols: number,
  stepX: number,
  stepY: number,
  count: number,
): number {
  'worklet';
  if (count <= 0 || cols <= 0 || stepX <= 0 || stepY <= 0) return from;
  const col = from % cols;
  const row = Math.floor(from / cols);
  const rows = Math.ceil(count / cols);
  const c = Math.max(0, Math.min(cols - 1, col + Math.round(dx / stepX)));
  const r = Math.max(0, Math.min(rows - 1, row + Math.round(dy / stepY)));
  return Math.max(0, Math.min(count - 1, r * cols + c));
}

/** Move one element of `list` from index `from` to index `to` (new array). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const out = [...list];
  const [it] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, it);
  return out;
}

export interface PriceScale {
  lo: number;
  hi: number;
  /** 0..1 position of a price on the bar (clamped). */
  pos: (v: number) => number;
}

/** Scale for the anchoring bar: the comparables range sits in the middle half. */
export function priceScale(min: number, max: number): PriceScale {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  const span = b - a;
  const lo = Math.max(0, span > 0 ? a - span * 0.5 : a * 0.7);
  const hi = span > 0 ? b + span * 0.5 : Math.max(b * 1.3, b + 1);
  const pos = (v: number) => (hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0.5);
  return { lo, hi, pos };
}

/** Rounded, de-duplicated price presets around the suggestion (anchoring). */
export function pricePresets(min: number | null, suggested: number | null, max: number | null): number[] {
  const r = (n: number) => Math.max(500, Math.round(n / 500) * 500);
  const raw = [min, suggested, max].filter((n): n is number => n != null && Number.isFinite(n) && n > 0).map(r);
  return Array.from(new Set(raw)).sort((x, y) => x - y);
}

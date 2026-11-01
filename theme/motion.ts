/**
 * Motion system — docs/09-ui-motion-redesign.md §3.
 *
 * Pure tokens + helpers (no Reanimated import) so they can be unit-tested and
 * shared. The Reanimated-specific builders (springs/timings carrying
 * `ReduceMotion.System`, entering/exiting presets) live in
 * `components/motion/anim.ts`.
 *
 * Budget (NN/g, Material): feedback 100 ms, transitions 200–300 ms, nothing
 * over 400 ms. Entering is slightly longer than exiting.
 */

/** Hard ceiling for any single animation (ms). */
export const MAX_DURATION = 400;

export const duration = {
  /** Press-in feedback. */
  press: 90,
  feedback: 100,
  short: 150,
  medium: 250,
  long: 350,
  /** Exits are a step shorter than entrances. */
  exit: 200,
  /** Tab content settling in when its tab gains focus. */
  tab: 200,
  /** Native-stack screen transitions (iOS honours it; Android uses the system timing). */
  screen: 300,
  /** Delay between staggered blocks of a screen entrance (sheet → dock). */
  step: 60,
} as const;

/** Offsets (dp) used by entrances: small shifts, never a full slide. */
export const offset = {
  /** Tab content shift on focus. */
  tab: 10,
  /** Content sheet / dock rising into place. */
  rise: 40,
  /** "The card opens": the photo scales up from this. */
  openScale: 0.96,
} as const;

/** Cubic-bezier control points (Material 3 "emphasized"). */
export const easing = {
  enter: [0.05, 0.7, 0.1, 1] as const,
  exit: [0.3, 0, 0.8, 0.15] as const,
  standard: [0.2, 0, 0, 1] as const,
};

export interface SpringTokens {
  damping: number;
  stiffness: number;
  mass: number;
}

/**
 * Physics spring from a damping RATIO (Material spec tokens are expressed as
 * ratio + stiffness). Reanimated's physics config wants the damping
 * coefficient: c = ζ · 2√(k·m).
 */
export function springFromRatio(ratio: number, stiffness: number, mass = 1): SpringTokens {
  return {
    damping: Math.round(ratio * 2 * Math.sqrt(stiffness * mass) * 10) / 10,
    stiffness,
    mass,
  };
}

/** ζ = c / (2√(k·m)). */
export function dampingRatio(s: SpringTokens): number {
  return s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
}

/** Spatial springs, damping ratio 0.9 (barely any overshoot). */
export const SPATIAL_DAMPING_RATIO = 0.9;
export const spring = {
  /** Toggles, chips, icons, heart, press release. */
  fast: springFromRatio(SPATIAL_DAMPING_RATIO, 1400),
  /** Sheets, cards, tab indicator. */
  default: springFromRatio(SPATIAL_DAMPING_RATIO, 700),
  /** Full-screen transitions. */
  slow: springFromRatio(SPATIAL_DAMPING_RATIO, 300),
} as const;

/** Approximate settle time (ms) of an under-damped spring to 2 % (4/ζω). */
export function springSettleMs(s: SpringTokens): number {
  const omega = Math.sqrt(s.stiffness / s.mass);
  const zeta = Math.min(dampingRatio(s), 1);
  return Math.round((4 / (zeta * omega)) * 1000);
}

export const press = { scale: 0.97, inDuration: duration.press } as const;

export const stagger = { step: 30, max: 8 } as const;

/**
 * Entrance delay for item `index` of a list's FIRST paint. Returns `null` when
 * the item should not animate at all (past the first `max` items).
 */
export function staggerDelay(index: number, step: number = stagger.step, max: number = stagger.max): number | null {
  if (!Number.isFinite(index) || index < 0 || index >= max) return null;
  return Math.round(index) * step;
}

/** Clamp any requested duration into the motion budget; 0 when reduced. */
export function budget(ms: number, reduced = false): number {
  if (reduced || !Number.isFinite(ms) || ms <= 0) return 0;
  return Math.min(ms, MAX_DURATION);
}

/** Haptic per interaction (through lib/haptics.ts). */
export const haptic = {
  chip: 'selection',
  tab: 'selection',
  like: 'light',
  send: 'light',
  step: 'light',
  publish: 'success',
  sale: 'success',
  error: 'error',
} as const;
export type HapticKind = 'selection' | 'light' | 'success' | 'warning' | 'error';

/**
 * Scroll chrome (collapsing header + hiding tab bar): returns the next
 * "hidden" state from a scroll delta. Small jitters are ignored; near the top
 * the chrome is always shown.
 */
export function nextChromeHidden(
  prevHidden: boolean,
  y: number,
  dy: number,
  opts: { threshold?: number; topZone?: number } = {},
): boolean {
  'worklet';
  const threshold = opts.threshold ?? 8;
  const topZone = opts.topZone ?? 24;
  if (y <= topZone) return false;
  if (dy > threshold) return true;
  if (dy < -threshold) return false;
  return prevHidden;
}

/** Index → x offset for a sliding indicator over equal-width slots. */
export function slotOffset(index: number, slotWidth: number, inset = 0): number {
  'worklet';
  return inset + Math.max(0, index) * slotWidth;
}

/** Shake keyframes (OTP error): 6 px, 3 times. */
export function shakeOffsets(amplitude = 6, times = 3): number[] {
  const out: number[] = [];
  for (let i = 0; i < times; i++) out.push(amplitude, -amplitude);
  out.push(0);
  return out;
}

/** Nearest sheet snap (translateY space) after projecting the fling velocity. */
export function pickSnap(y: number, vy: number, snaps: number[], closeY: number): number {
  'worklet';
  const projected = y + vy * 0.12;
  const lowest = Math.max(...snaps);
  if (vy > 1400 || projected > lowest + (closeY - lowest) * 0.35) return closeY;
  let best = snaps[0];
  for (const s of snaps) if (Math.abs(s - projected) < Math.abs(best - projected)) best = s;
  return best;
}

export const SWIPE_THRESHOLD = 88;

/** Which swipe action a release at offset `x` triggers. */
export function swipeOutcome(x: number, threshold = SWIPE_THRESHOLD): 'left' | 'right' | null {
  'worklet';
  if (x >= threshold) return 'left';
  if (x <= -threshold) return 'right';
  return null;
}

export const motionTokens = { duration, easing, spring, press, stagger, haptic, offset, MAX_DURATION } as const;

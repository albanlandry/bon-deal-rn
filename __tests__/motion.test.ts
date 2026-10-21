import {
  MAX_DURATION,
  budget,
  dampingRatio,
  duration,
  nextChromeHidden,
  pickSnap,
  press,
  shakeOffsets,
  slotOffset,
  spring,
  springFromRatio,
  springSettleMs,
  stagger,
  staggerDelay,
  swipeOutcome,
} from '@/theme/motion';

describe('motion tokens', () => {
  it('keeps every duration inside the 400 ms budget, exits shorter than enters', () => {
    for (const v of Object.values(duration)) expect(v).toBeLessThanOrEqual(MAX_DURATION);
    expect(duration.short).toBe(150);
    expect(duration.medium).toBe(250);
    expect(duration.long).toBe(350);
    expect(duration.exit).toBeLessThan(duration.medium);
    expect(press.scale).toBe(0.97);
    expect(press.inDuration).toBeLessThan(100);
  });

  it('builds spatial springs at damping ratio 0.9 with the spec stiffnesses', () => {
    expect(spring.fast.stiffness).toBe(1400);
    expect(spring.default.stiffness).toBe(700);
    expect(spring.slow.stiffness).toBe(300);
    for (const s of Object.values(spring)) {
      expect(dampingRatio(s)).toBeCloseTo(0.9, 2);
      expect(springSettleMs(s)).toBeLessThanOrEqual(MAX_DURATION);
    }
    expect(springFromRatio(1, 100)).toEqual({ damping: 20, stiffness: 100, mass: 1 });
  });

  it('staggers only the first 8 items by 30 ms', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(90);
    expect(staggerDelay(stagger.max - 1)).toBe(210);
    expect(staggerDelay(stagger.max)).toBeNull();
    expect(staggerDelay(-1)).toBeNull();
    expect(staggerDelay(Number.NaN)).toBeNull();
  });

  it('clamps durations and zeroes them with reduce motion', () => {
    expect(budget(250)).toBe(250);
    expect(budget(1200)).toBe(MAX_DURATION);
    expect(budget(250, true)).toBe(0);
    expect(budget(-5)).toBe(0);
  });
});

describe('scroll chrome', () => {
  it('hides on scroll down, shows on scroll up, ignores jitter, always shows near the top', () => {
    expect(nextChromeHidden(false, 300, 20)).toBe(true);
    expect(nextChromeHidden(true, 300, -20)).toBe(false);
    expect(nextChromeHidden(true, 300, 3)).toBe(true);
    expect(nextChromeHidden(false, 300, -3)).toBe(false);
    expect(nextChromeHidden(true, 10, 40)).toBe(false);
  });

  it('places a sliding indicator on equal slots', () => {
    expect(slotOffset(0, 80, 10)).toBe(10);
    expect(slotOffset(3, 80, 10)).toBe(250);
    expect(slotOffset(-1, 80)).toBe(0);
  });
});

describe('gestures', () => {
  const snaps = [400, 0]; // 50 % and 90 % of a sheet, translateY space
  it('snaps a sheet to the nearest point after projecting velocity', () => {
    expect(pickSnap(380, 0, snaps, 900)).toBe(400);
    expect(pickSnap(60, 0, snaps, 900)).toBe(0);
    expect(pickSnap(300, -2000, snaps, 900)).toBe(0);
  });

  it('closes a sheet on a fast fling or a long drag down', () => {
    expect(pickSnap(420, 1600, snaps, 900)).toBe(900);
    expect(pickSnap(620, 0, snaps, 900)).toBe(900);
  });

  it('maps a swipe release to an action past the threshold only', () => {
    expect(swipeOutcome(120)).toBe('left');
    expect(swipeOutcome(-120)).toBe('right');
    expect(swipeOutcome(40)).toBeNull();
  });

  it('shakes 6 px three times and settles at 0', () => {
    expect(shakeOffsets()).toEqual([6, -6, 6, -6, 6, -6, 0]);
  });
});

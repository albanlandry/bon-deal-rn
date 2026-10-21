/**
 * Reanimated builders on top of theme/motion.ts. EVERY animation in the app
 * should come from here (or pass `reduceMotion: ReduceMotion.System` itself):
 * with the OS "reduce motion" setting on, Reanimated jumps to the end state.
 */
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
  ReduceMotion,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { duration, easing, spring as springTokens, staggerDelay } from '@/theme/motion';

export const RM = ReduceMotion.System;

export const ease = {
  enter: Easing.bezier(...easing.enter),
  exit: Easing.bezier(...easing.exit),
  standard: Easing.bezier(...easing.standard),
};

export type SpringName = keyof typeof springTokens;

/** Spring config carrying ReduceMotion.System. */
export function springConfig(name: SpringName = 'default'): WithSpringConfig {
  return { ...springTokens[name], reduceMotion: RM };
}

export function timingConfig(ms: number = duration.medium, curve: keyof typeof ease = 'enter'): WithTimingConfig {
  return { duration: Math.min(ms, 400), easing: ease[curve], reduceMotion: RM };
}

/** `withSpring(to, spring.<name>)` with ReduceMotion.System. */
export function spring(to: number, name: SpringName = 'default', cb?: (finished?: boolean) => void) {
  'worklet';
  return withSpring(to, { ...springTokens[name], reduceMotion: ReduceMotion.System }, cb);
}

/** `withTiming` with an emphasised curve and ReduceMotion.System. */
export function timing(
  to: number,
  ms: number = duration.medium,
  curve: 'enter' | 'exit' | 'standard' = 'enter',
  cb?: (finished?: boolean) => void,
) {
  'worklet';
  const bez =
    curve === 'exit'
      ? Easing.bezier(0.3, 0, 0.8, 0.15)
      : curve === 'standard'
        ? Easing.bezier(0.2, 0, 0, 1)
        : Easing.bezier(0.05, 0.7, 0.1, 1);
  return withTiming(to, { duration: Math.min(ms, 400), easing: bez, reduceMotion: ReduceMotion.System }, cb);
}

/* ---------- Layout-animation presets (entering / exiting / layout) ---------- */

/** Fade + 8 px rise; `index` staggers the first 8 items, others get none. */
export function enterUp(index = 0, ms: number = duration.medium) {
  const d = staggerDelay(index);
  const b = FadeInDown.duration(ms).easing(ease.enter).withInitialValues({ transform: [{ translateY: 8 }] }).reduceMotion(RM);
  return d ? b.delay(d) : b;
}

export const enterFade = (ms: number = duration.short) => FadeIn.duration(ms).reduceMotion(RM);
export const exitFade = (ms: number = duration.short) => FadeOut.duration(ms).reduceMotion(RM);
export const enterFromBottom = (ms: number = duration.short) =>
  FadeInDown.duration(ms).withInitialValues({ transform: [{ translateY: 12 }] }).reduceMotion(RM);
export const enterFromTop = (ms: number = duration.medium) => FadeInUp.duration(ms).reduceMotion(RM);
export const exitDown = (ms: number = duration.exit) => FadeOutDown.duration(ms).reduceMotion(RM);
export const exitUp = (ms: number = duration.exit) => FadeOutUp.duration(ms).reduceMotion(RM);
/** Smooth reflow when siblings appear/disappear (rows moving to the top, chips). */
export const layoutSpring = () => LinearTransition.springify()
    .damping(springTokens.default.damping)
    .stiffness(springTokens.default.stiffness)
    .reduceMotion(RM);
export const layoutEase = (ms: number = duration.medium) => LinearTransition.duration(ms).reduceMotion(RM);

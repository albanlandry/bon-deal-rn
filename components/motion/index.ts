/** Motion primitives (docs/09 §3). All reduce-motion aware (ReduceMotion.System). */
export * from './anim';
export { default as AnimatedHeader } from './AnimatedHeader';
export { default as AnimatedTabBar, TAB_BAR_HEIGHT, useTabBarInset } from './AnimatedTabBar';
export { default as Breathe } from './Breathe';
export { default as Celebrate, CELEBRATE_MS } from './Celebrate';
export { default as CountUp } from './CountUp';
export { default as FadeInView, Stagger, useDelayedFlag, useFirstPaint } from './FadeInView';
export { default as HeartBurst } from './HeartBurst';
export { default as PressableScale } from './PressableScale';
export { default as ProgressBar } from './ProgressBar';
export {
  ScrollChromeProvider,
  useScrollChrome,
  useShowTabBarOnFocus,
  useTabBarHidden,
  type ScrollChrome,
} from './ScrollChrome';
export { default as Sheet, pickSnap, type SheetProps } from './Sheet';
export { default as Shimmer } from './Shimmer';
export { default as SwipeRow, SWIPE_THRESHOLD, swipeOutcome, type SwipeAction } from './SwipeRow';

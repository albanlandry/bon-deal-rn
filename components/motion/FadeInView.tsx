/**
 * List entrance on FIRST PAINT only (docs/09 §3 `stagger`): fade + small rise,
 * 30 ms per item, first 8 items. Never replays on refetch: pass
 * `animate={false}` (e.g. from `useFirstPaint`) once the list has painted.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { staggerDelay } from '@/theme/motion';
import { enterUp } from './anim';

export interface FadeInViewProps {
  index?: number;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function FadeInView({ index = 0, animate = true, style, children }: FadeInViewProps) {
  const run = animate && staggerDelay(index) !== null;
  return (
    <Animated.View entering={run ? enterUp(index) : undefined} style={style}>
      {children}
    </Animated.View>
  );
}

/** Wraps each child in a FadeInView with its index (static lists, sections). */
export function Stagger({
  children,
  animate = true,
  style,
}: {
  children: React.ReactNode;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <>
      {items.map((child, i) => (
        <FadeInView key={(child as any)?.key ?? i} index={i} animate={animate} style={style}>
          {child}
        </FadeInView>
      ))}
    </>
  );
}

/**
 * `true` until the list has had data for a short moment, then `false` for the
 * lifetime of the screen — so stagger runs on the first paint only and never
 * on refetch, pagination or recycling.
 */
export function useFirstPaint(hasData: boolean, windowMs = 600): boolean {
  const [first, setFirst] = useState(true);
  const done = useRef(false);
  useEffect(() => {
    if (!hasData || done.current) return;
    const id = setTimeout(() => {
      done.current = true;
      setFirst(false);
    }, windowMs);
    return () => clearTimeout(id);
  }, [hasData, windowMs]);
  return first;
}

/** `true` only once `active` has stayed true for `delayMs` (skeletons > ~1 s). */
export function useDelayedFlag(active: boolean, delayMs = 1000): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }
    const id = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(id);
  }, [active, delayMs]);
  return on;
}

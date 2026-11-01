/**
 * Counts a number up on first view (docs/09 §3). ONLY for the user's own
 * stats (annonces, ventes, avis) — never for prices. 400 ms, ease-out;
 * "reduce motion" shows the final value immediately.
 */
import React, { useEffect, useState } from 'react';
import { Easing, ReduceMotion, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import AppText, { type AppTextProps } from '@/components/atoms/AppText';
import { formatNumber } from '@/lib/format';

export interface CountUpProps extends Omit<AppTextProps, 'children'> {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
}

export default function CountUp({ value, durationMs = 400, format = formatNumber, ...text }: CountUpProps) {
  const target = Number.isFinite(value) ? value : 0;
  const n = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    n.value = withTiming(target, {
      duration: Math.min(durationMs, 400),
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [target, durationMs, n]);

  useAnimatedReaction(
    () => Math.round(n.value),
    (cur, prev) => {
      if (cur !== prev) runOnJS(setShown)(cur);
    },
  );

  return (
    <AppText accessibilityLabel={format(target)} {...text}>
      {format(shown)}
    </AppText>
  );
}

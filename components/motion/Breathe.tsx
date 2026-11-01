/**
 * Gentle "breathing" for an illustration (maintenance / update screens,
 * docs/09 §4). Not a decorative loop: ONE breath (in + out, 400 ms total, the
 * motion ceiling) when the screen appears, then it rests. Scale + opacity
 * only; static with "reduce motion".
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSequence } from 'react-native-reanimated';
import { MAX_DURATION } from '@/theme/motion';
import { timing } from './anim';

export default function Breathe({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** @deprecated Ignored: Breathe now does a single breath (docs/09 ≤400 ms). */
  cycles?: number;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    const half = MAX_DURATION / 2;
    v.value = withSequence(ReduceMotion.System, timing(1, half, 'standard'), timing(0, half, 'standard'));
  }, [v]);
  const anim = useAnimatedStyle(() => ({
    opacity: 0.85 + 0.15 * (1 - v.value),
    transform: [{ scale: 1 + 0.04 * v.value }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

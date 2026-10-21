/**
 * Gentle "breathing" for an illustration (maintenance / update screens,
 * docs/09 §4). Not a decorative loop: it breathes twice when the screen
 * appears, then rests. Scale + opacity only; static with "reduce motion".
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function Breathe({
  children,
  style,
  cycles = 2,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  cycles?: number;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System }),
      cycles * 2,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [cycles, v]);
  const anim = useAnimatedStyle(() => ({
    opacity: 0.85 + 0.15 * (1 - v.value),
    transform: [{ scale: 1 + 0.04 * v.value }],
  }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

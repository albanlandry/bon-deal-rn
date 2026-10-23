/**
 * Press feedback (docs/09 §3 `press`): scale 0.97 in 90 ms on press-in, fast
 * spring back on release. Starts under the Doherty threshold. Optional haptic.
 * Animates transform only.
 */
import React, { forwardRef } from 'react';
import { GestureResponderEvent, Pressable, PressableProps, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { press as pressTokens, type HapticKind } from '@/theme/motion';
import { spring, timing } from './anim';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (default 0.97). */
  scaleTo?: number;
  haptic?: HapticKind | false;
  children?: React.ReactNode;
}

const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, scaleTo = pressTokens.scale, haptic = false, onPressIn, onPressOut, onPress, disabled, children, ...rest },
  ref,
) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      ref={ref as any}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        s.value = timing(scaleTo, pressTokens.inDuration, 'standard');
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        s.value = spring(1, 'fast');
        onPressOut?.(e);
      }}
      onPress={(e: GestureResponderEvent) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, anim]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
});

export default PressableScale;

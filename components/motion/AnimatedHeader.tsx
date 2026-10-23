/**
 * Collapsing header driven by scroll (docs/09 §4 Home). Absolutely positioned
 * over the list: the `collapsible` part slides up and fades out when the
 * chrome hides, the `sticky` part (search pill, category row) stays pinned.
 * The list underneath gets `paddingTop = height` (see `onHeight`).
 */
import React, { useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme';

export interface AnimatedHeaderProps {
  progress: SharedValue<number>;
  collapsible?: React.ReactNode;
  sticky?: React.ReactNode;
  /** Total height (collapsible + sticky), for the list's top padding. */
  onHeight?: (h: number) => void;
  style?: StyleProp<ViewStyle>;
  /** Hairline under the header once collapsed. */
  divider?: boolean;
}

export default function AnimatedHeader({ progress, collapsible, sticky, onHeight, style, divider = true }: AnimatedHeaderProps) {
  const t = useTheme();
  const [collapseH, setCollapseH] = useState(0);

  const wrap = useAnimatedStyle(() => ({
    transform: [{ translateY: -collapseH * progress.value }],
  }));
  const top = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], 'clamp'),
  }));
  const line = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      onLayout={(e: LayoutChangeEvent) => onHeight?.(Math.round(e.nativeEvent.layout.height))}
      style={[styles.wrap, { backgroundColor: t.colors.canvas }, style, wrap]}>
      {collapsible ? (
        <Animated.View onLayout={(e) => setCollapseH(Math.round(e.nativeEvent.layout.height))} style={top}>
          {collapsible}
        </Animated.View>
      ) : null}
      <View style={{ backgroundColor: t.colors.canvas }}>{sticky}</View>
      {divider && (
        <Animated.View style={[styles.line, { backgroundColor: t.colors.line }, line]} pointerEvents="none" />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  line: { height: StyleSheet.hairlineWidth },
});

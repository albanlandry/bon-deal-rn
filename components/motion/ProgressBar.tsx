/**
 * Spring-filled progress bar (docs/09 §3). The fill is full-width and scaled
 * on X from the left edge, so only `transform` animates.
 */
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { spring } from './anim';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export default function ProgressBar({ progress, height = 4, color, trackColor, style, accessibilityLabel }: ProgressBarProps) {
  const t = useTheme();
  const v = clamp01(progress);
  const s = useSharedValue(v);
  useEffect(() => {
    s.value = spring(v, 'default');
  }, [v, s]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: s.value }] }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? t.colors.surfaceAlt },
        style,
      ]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color ?? t.colors.brand, borderRadius: height / 2, transformOrigin: 'left' },
          fill,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({ track: { overflow: 'hidden', width: '100%' } });

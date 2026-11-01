import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import { timing } from '../motion/anim';
import AppText from './AppText';

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  label?: string;
  children?: React.ReactNode;
  /** Ring colour (default brand). */
  color?: string;
}

/**
 * Circular progress without react-native-svg: two clipped half-rings rotated
 * into place. Used for profile completeness (goal-gradient, endowed
 * progress). The ring ANIMATES from 0 to its value on mount (docs/09 §4
 * Profile) — rotation only, ReduceMotion.System via `timing`.
 */
export default function ProgressRing({ progress, size = 72, stroke = 6, label, children, color }: ProgressRingProps) {
  const t = useTheme();
  const p = Math.max(0, Math.min(1, progress));
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = timing(p, duration.long, 'enter');
  }, [p, v]);

  const half = size / 2;
  const ring = { width: size, height: size, borderRadius: half, borderWidth: stroke };
  const fill = color ?? t.colors.brand;

  const right = useAnimatedStyle(() => {
    const deg = v.value * 360;
    return { opacity: deg > 0.5 ? 1 : 0, transform: [{ rotate: `${Math.min(deg, 180) - 135}deg` }] };
  });
  const left = useAnimatedStyle(() => {
    const deg = Math.max(v.value * 360 - 180, 0);
    return { opacity: deg > 0 ? 1 : 0, transform: [{ rotate: `${deg - 135}deg` }] };
  });

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      accessibilityLabel={label}>
      <View style={[StyleSheet.absoluteFill, ring, { borderColor: t.colors.line }]} />
      {/* right half (0–180°) */}
      <View style={[styles.halfClip, { width: half, height: size, left: half }]}>
        <Animated.View
          style={[
            ring,
            { position: 'absolute', left: -half, borderColor: 'transparent', borderRightColor: fill, borderTopColor: fill },
            right,
          ]}
        />
      </View>
      {/* left half (180–360°) */}
      <View style={[styles.halfClip, { width: half, height: size, left: 0 }]}>
        <Animated.View
          style={[
            ring,
            { position: 'absolute', left: 0, borderColor: 'transparent', borderLeftColor: fill, borderBottomColor: fill },
            left,
          ]}
        />
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        {children ?? (
          <AppText variant="captionStrong" color="ink">
            {Math.round(p * 100)} %
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halfClip: { position: 'absolute', top: 0, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});

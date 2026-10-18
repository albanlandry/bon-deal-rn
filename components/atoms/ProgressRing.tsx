import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from './AppText';

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  label?: string;
  children?: React.ReactNode;
}

/**
 * Circular progress without react-native-svg: two clipped half-rings rotated
 * into place. Used for profile completeness (goal-gradient, endowed progress).
 */
export default function ProgressRing({ progress, size = 72, stroke = 6, label, children }: ProgressRingProps) {
  const t = useTheme();
  const p = Math.max(0, Math.min(1, progress));
  const deg = p * 360;
  const half = size / 2;
  const ring = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
  };
  const rightDeg = Math.min(deg, 180);
  const leftDeg = Math.max(deg - 180, 0);
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      accessibilityLabel={label}>
      <View style={[StyleSheet.absoluteFill, ring, { borderColor: t.colors.line }]} />
      {/* right half (0–180°) */}
      <View style={[styles.halfClip, { width: half, height: size, left: half }]}>
        <View
          style={[
            ring,
            {
              position: 'absolute',
              left: -half,
              borderColor: 'transparent',
              borderRightColor: t.colors.brand,
              borderTopColor: t.colors.brand,
              transform: [{ rotate: `${rightDeg - 135}deg` }],
              opacity: deg > 0 ? 1 : 0,
            },
          ]}
        />
      </View>
      {/* left half (180–360°) */}
      <View style={[styles.halfClip, { width: half, height: size, left: 0 }]}>
        <View
          style={[
            ring,
            {
              position: 'absolute',
              left: 0,
              borderColor: 'transparent',
              borderLeftColor: t.colors.brand,
              borderBottomColor: t.colors.brand,
              transform: [{ rotate: `${leftDeg - 135}deg` }],
              opacity: leftDeg > 0 ? 1 : 0,
            },
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

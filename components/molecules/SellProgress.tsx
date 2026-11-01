/**
 * Thin segmented progress for the 3-step sell flow (docs/12): one 4 dp
 * segment per step, done/current filled in brand. The fill grows with a
 * scaleX transform (≤ 250 ms, ReduceMotion.System). Works on the dark
 * camera step (`onDark`) and on the light form steps.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import AppText from '../atoms/AppText';
import { timing } from '../motion/anim';

function Segment({ filled, track, color }: { filled: boolean; track: string; color: string }) {
  const p = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    p.value = timing(filled ? 1 : 0, duration.medium, 'enter');
  }, [filled, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: p.value }] }));
  return (
    <View style={[styles.seg, { backgroundColor: track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, transformOrigin: 'left' }, style]} />
    </View>
  );
}

export interface SellProgressProps {
  steps: string[];
  current: number;
  onDark?: boolean;
}

export default function SellProgress({ steps, current, onDark = false }: SellProgressProps) {
  const t = useTheme();
  const track = onDark ? 'rgba(255,255,255,0.18)' : t.colors.surfaceAlt;
  const color = onDark && !t.isDark ? '#7AA2FF' : t.colors.brand;
  const n = steps.length;
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${current + 1} sur ${n} : ${steps[current]}`}
      accessibilityValue={{ min: 1, max: n, now: current + 1 }}>
      <View style={styles.row}>
        {steps.map((s, i) => (
          <Segment key={s} filled={i <= current} track={track} color={color} />
        ))}
      </View>
      <AppText
        variant="captionStrong"
        style={{ color: onDark ? 'rgba(255,255,255,0.78)' : t.colors.inkMuted }}
        importantForAccessibility="no"
        accessibilityElementsHidden>
        {current + 1}/{n} · {steps[current]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  row: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFillObject, borderRadius: 2 },
});

/**
 * Switch with a spring thumb (docs/09 §4 Settings). Visual only: the parent
 * row owns the press/accessibility (role "switch"). The "on" track fades in
 * (opacity) and the thumb slides (translateX, spring.fast).
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { spring } from '../motion/anim';

const W = 52;
const H = 32;
const THUMB = 24;
const TRAVEL = W - THUMB - 8;

export default function SpringSwitch({ value, disabled }: { value: boolean; disabled?: boolean }) {
  const t = useTheme();
  const v = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    v.value = spring(value ? 1 : 0, 'fast');
  }, [value, v]);
  const on = useAnimatedStyle(() => ({ opacity: v.value }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * TRAVEL }] }));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.track, { backgroundColor: t.colors.line, opacity: disabled ? 0.45 : 1 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.round, { backgroundColor: t.colors.brand }, on]} />
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: value ? t.colors.onBrand : t.colors.surface, borderColor: t.colors.inkSubtle },
          thumb,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, justifyContent: 'center', paddingHorizontal: 4 },
  round: { borderRadius: H / 2 },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 1 },
});

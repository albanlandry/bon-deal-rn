/**
 * Like button with a burst (docs/09 §4 Home): optimistic toggle, the heart
 * pops (scale 1 → 1.25 → 1) and a ring of 6 particles flies out and fades,
 * ~300 ms, light haptic. Only the pressed heart animates.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import { spring, timing } from './anim';
import PressableScale from './PressableScale';

const PARTICLES = 6;

function Particle({ i, p, color, radius }: { i: number; p: SharedValue<number>; color: string; radius: number }) {
  const angle = (i / PARTICLES) * Math.PI * 2 - Math.PI / 2;
  const style = useAnimatedStyle(() => ({
    opacity: p.value > 0 && p.value < 1 ? 1 - p.value : 0,
    transform: [
      { translateX: Math.cos(angle) * radius * p.value },
      { translateY: Math.sin(angle) * radius * p.value },
      { scale: 1 - p.value * 0.5 },
    ],
  }));
  return <Animated.View pointerEvents="none" style={[styles.particle, { backgroundColor: color }, style]} />;
}

export interface HeartBurstProps {
  liked: boolean;
  onToggle: () => void;
  size?: number;
  /** Touch target (≥ 48 dp incl. hitSlop). */
  box?: number;
  style?: StyleProp<ViewStyle>;
  /** Inactive icon colour (default ink). */
  color?: string;
  background?: string;
  accessibilityLabel?: string;
}

export default function HeartBurst({
  liked,
  onToggle,
  size = 20,
  box = 40,
  style,
  color,
  background,
  accessibilityLabel,
}: HeartBurstProps) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const p = useSharedValue(0);
  const prev = useRef(liked);

  useEffect(() => {
    if (liked && !prev.current) {
      scale.value = withSequence(timing(1.25, duration.feedback, 'standard'), spring(1, 'fast'));
      p.value = 0;
      p.value = timing(1, 300, 'enter');
    }
    prev.current = liked;
  }, [liked, p, scale]);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const active = t.colors.brandStrong;
  const slop = Math.max(0, (48 - box) / 2);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (liked ? 'Retirer des favoris' : 'Ajouter aux favoris')}
      accessibilityState={{ selected: liked }}
      haptic="light"
      hitSlop={slop}
      scaleTo={0.9}
      onPress={onToggle}
      style={[styles.box, { width: box, height: box, borderRadius: box / 2, backgroundColor: background }, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          {Array.from({ length: PARTICLES }, (_, i) => (
            <Particle key={i} i={i} p={p} color={i % 2 ? t.colors.brand : active} radius={box * 0.6} />
          ))}
        </View>
      </View>
      <Animated.View style={heartStyle}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={size} color={liked ? active : color ?? t.colors.ink} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
});

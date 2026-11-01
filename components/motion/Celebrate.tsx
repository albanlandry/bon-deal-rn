/**
 * Peak–end celebration (docs/09 §2): a confetti burst made of plain Views (no
 * Lottie), under 900 ms, at the peaks only (publish, offer accepted, sale).
 * Never blocks touches (pointerEvents none), so it is always skippable; with
 * "reduce motion" it jumps to its end state (invisible) immediately.
 * Success haptic is fired by the caller's action (or `haptic`).
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export const CELEBRATE_MS = 850;
const PIECES = 28;

interface Piece {
  vx: number;
  vy: number;
  rot: number;
  w: number;
  h: number;
  color: string;
}

/** Deterministic pseudo-random so a burst looks the same every time. */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function makePieces(count: number, colors: string[], spread: number): Piece[] {
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (rand(i + 1) - 0.5) * Math.PI * 1.1;
    const speed = spread * (0.55 + rand(i + 7) * 0.45);
    return {
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      rot: (rand(i + 3) - 0.5) * 720,
      w: 6 + rand(i + 5) * 6,
      h: 4 + rand(i + 11) * 4,
      color: colors[i % colors.length],
    };
  });
}

function ConfettiPiece({ piece, p, gravity }: { piece: Piece; p: SharedValue<number>; gravity: number }) {
  const style = useAnimatedStyle(() => {
    const v = p.value;
    return {
      opacity: v <= 0 || v >= 1 ? 0 : v > 0.7 ? (1 - v) / 0.3 : 1,
      transform: [
        { translateX: piece.vx * v },
        { translateY: piece.vy * v + gravity * v * v },
        { rotate: `${piece.rot * v}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.piece, { width: piece.w, height: piece.h, backgroundColor: piece.color }, style]}
    />
  );
}

export interface CelebrateProps {
  /** Change this value (e.g. Date.now()) to fire a burst. 0/undefined = idle. */
  trigger?: number;
  onDone?: () => void;
  /** Vertical origin as a fraction of the screen height (default 0.4). */
  originY?: number;
  haptic?: boolean;
}

export default function Celebrate({ trigger, onDone, originY = 0.4, haptic = true }: CelebrateProps) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const p = useSharedValue(0);
  const colors = useMemo(
    () => [t.colors.brand, t.colors.trust, t.colors.warning, t.colors.catBlue, t.colors.catPurple, t.colors.success],
    [t.colors],
  );
  const pieces = useMemo(() => makePieces(PIECES, colors, Math.min(width, 520) * 0.55), [colors, width]);

  useEffect(() => {
    if (!trigger) return;
    if (haptic) haptics.success();
    p.value = 0;
    p.value = withTiming(
      1,
      { duration: CELEBRATE_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System },
      (done) => {
        'worklet';
        if (done && onDone) runOnJS(onDone)();
      },
    );
  }, [trigger]);

  if (!trigger) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.origin, { top: height * originY, left: width / 2 }]}>
        {pieces.map((pc, i) => (
          <ConfettiPiece key={i} piece={pc} p={p} gravity={height * 0.35} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', width: 0, height: 0 },
  piece: { position: 'absolute', borderRadius: 2 },
});

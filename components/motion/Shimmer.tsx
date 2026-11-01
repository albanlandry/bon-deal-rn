/**
 * Skeleton shine (docs/09 §3). A soft highlight band sweeps across the block
 * while content loads. It is a loading indicator (like a spinner), so it
 * repeats only while mounted; with "reduce motion" the block stays static.
 * Animates translateX only.
 */
import { requireOptionalNativeModule } from 'expo';
import React, { useEffect, useState } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, withAlpha } from '@/theme';

let LinearGradient: any = null;
try {
  if (requireOptionalNativeModule('ExpoLinearGradient')) {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
  }
} catch {
  LinearGradient = null;
}

export interface ShimmerProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Shimmer({ width = '100%', height = 16, radius, style }: ShimmerProps) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (!w || t.reduceMotion) return;
    x.value = 0;
    x.value = withRepeat(
      withDelay(
        250,
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
    return () => cancelAnimation(x);
  }, [w, t.reduceMotion, x]);

  const band = Math.max(40, w * 0.6);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: -band + x.value * (w + band) }],
  }));
  const hl = t.colors.skeletonHighlight;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[
        styles.base,
        { width, height, borderRadius: radius ?? t.radius.sm, backgroundColor: t.colors.skeleton },
        style,
      ]}>
      {!!w && !t.reduceMotion && (
        <Animated.View style={[StyleSheet.absoluteFill, { width: band }, anim]}>
          {LinearGradient ? (
            <LinearGradient
              colors={[withAlpha(hl, 0), hl, withAlpha(hl, 0)]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hl, opacity: 0.7 }]} />
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ base: { overflow: 'hidden' } });

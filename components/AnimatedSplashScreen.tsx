/**
 * Animated splash in the "Marché" palette. Rendered before the theme provider
 * mounts, so it reads the static tokens directly and follows the system
 * colour scheme itself. With "reduce motion" on it skips the animation and
 * finishes quickly. Contract unchanged: calls `onFinish` once.
 */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { darkColors, lightColors } from '@/theme/tokens';

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

const FULL_MS = 1800;
const REDUCED_MS = 500;

export default function AnimatedSplashScreen({ onFinish }: AnimatedSplashScreenProps) {
  const c = useColorScheme() === 'dark' ? darkColors : lightColors;
  const [reduce, setReduce] = useState<boolean | null>(null);

  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const textY = useSharedValue(16);
  const textOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => mounted && setReduce(v))
      .catch(() => mounted && setReduce(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      scale.value = 1;
      opacity.value = 1;
      textY.value = 0;
      textOpacity.value = 1;
      tagOpacity.value = 1;
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      textY.value = withDelay(300, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
      textOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
      tagOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    }
    const timer = setTimeout(onFinish, reduce ? REDUCED_MS : FULL_MS);
    return () => clearTimeout(timer);
  }, [reduce]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textY.value }],
    opacity: textOpacity.value,
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));

  return (
    <View
      style={[styles.container, { backgroundColor: c.canvas }]}
      accessible
      accessibilityLabel="BonDeal, chargement">
      <LinearGradient
        colors={[c.brandTint, c.canvas]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.logo, { backgroundColor: c.brand }, logoStyle]}>
        <Text style={[styles.logoText, { color: c.onBrand }]}>BD</Text>
      </Animated.View>
      <Animated.View style={nameStyle}>
        <Text style={[styles.appName, { color: c.ink }]}>BonDeal</Text>
      </Animated.View>
      <Animated.View style={tagStyle}>
        <Text style={[styles.tagline, { color: c.inkMuted }]}>Les bonnes affaires de votre quartier</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  appName: { fontSize: 34, lineHeight: 41, fontWeight: '700', textAlign: 'center' },
  tagline: { fontSize: 16, lineHeight: 22, marginTop: 6, textAlign: 'center' },
});

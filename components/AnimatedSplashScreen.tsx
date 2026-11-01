/**
 * Animated splash in the "Marché" palette, drawn as an overlay ABOVE the app
 * (the root layout mounts the app underneath as soon as it can, so the splash
 * never delays the first real render).
 *
 * - Rendered outside the theme provider, so it reads the static tokens and the
 *   user's saved theme preference itself (same AsyncStorage key as
 *   theme/index.tsx), falling back to the system scheme.
 * - Entrance uses the motion tokens (docs/09 §3), every animation carries
 *   `ReduceMotion.System`.
 * - It ends when the app is `ready` and at least MIN_VISIBLE_MS have passed,
 *   then fades out (exit duration) and calls `onFinish` once.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useColorScheme } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { spring, timing } from '@/components/motion/anim';
import { PREF_KEY } from '@/theme';
import { duration } from '@/theme/motion';
import { darkColors, lightColors, type ThemePreference } from '@/theme/tokens';

interface AnimatedSplashScreenProps {
  /** True once the app underneath can be shown (fonts loaded). */
  ready?: boolean;
  onFinish: () => void;
}

/** Long enough to read the mark, short enough not to feel like a wait. */
const MIN_VISIBLE_MS = 600;

export default function AnimatedSplashScreen({ ready = true, onFinish }: AnimatedSplashScreenProps) {
  const system = useColorScheme();
  // null until the saved preference has been read (the native splash stays up
  // until then, so the colours never flash from light to dark).
  const [pref, setPref] = useState<ThemePreference | null>(null);
  const [minElapsed, setMinElapsed] = useState(false);
  const finished = useRef(false);

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const textY = useSharedValue(8);
  const textOpacity = useSharedValue(0);
  const tagOpacity = useSharedValue(0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => mounted && setPref(v === 'light' || v === 'dark' ? v : 'system'))
      .catch(() => mounted && setPref('system'));
    const timer = setTimeout(() => mounted && setMinElapsed(true), MIN_VISIBLE_MS);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Entrance, once the colours are known.
  useEffect(() => {
    if (pref === null) return;
    SplashScreen.hideAsync().catch(() => {});
    scale.value = spring(1, 'default');
    opacity.value = timing(1, duration.medium);
    textY.value = withDelay(duration.feedback, timing(0, duration.medium), ReduceMotion.System);
    textOpacity.value = withDelay(duration.feedback, timing(1, duration.medium), ReduceMotion.System);
    tagOpacity.value = withDelay(duration.medium, timing(1, duration.medium), ReduceMotion.System);
  }, [pref, scale, opacity, textY, textOpacity, tagOpacity]);

  // Exit as soon as the app is ready and the minimum time has passed.
  useEffect(() => {
    if (!ready || !minElapsed || pref === null || finished.current) return;
    finished.current = true;
    overlay.value = timing(0, duration.exit, 'exit', (done) => {
      'worklet';
      if (done !== false) runOnJS(onFinish)();
    });
  }, [ready, minElapsed, pref, overlay, onFinish]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  const nameStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textY.value }],
    opacity: textOpacity.value,
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));

  const dark = pref === 'dark' || ((pref === 'system' || pref === null) && system === 'dark');
  const c = dark ? darkColors : lightColors;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: c.canvas }, overlayStyle]}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 1000,
  },
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
  tagline: { fontSize: 16, lineHeight: 22, marginTop: 8, textAlign: 'center' },
});

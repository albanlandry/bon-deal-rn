import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, Theme as NavTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryClientProvider } from '@tanstack/react-query';

import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import AppGate from '@/components/organisms/AppGate';
import OfflineBanner from '@/components/organisms/OfflineBanner';
import { SharedPhotoOverlay } from '@/components/motion/SharedPhoto';
import Toast, { toastConfig } from '@/components/atoms/Toast';
import { PhoneAuthProvider } from '@/contexts/PhoneAuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { queryClient } from '@/lib/queryClient';
import { useForegroundMessageHandler, usePushTapHandler } from '@/lib/push';
import { AppThemeProvider, useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import { fontFiles } from '@/theme/tokens';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...fontFiles,
  });

  const [showSplash, setShowSplash] = useState(true);
  const isReady = loaded;

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // The app mounts as soon as fonts are loaded; the animated splash is an
  // overlay on top that fades out once the app is ready (600 ms minimum) and
  // hides the native splash itself once its colours are known.
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {isReady && (
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <RootLayoutNav />
          </AppThemeProvider>
        </QueryClientProvider>
      )}
      {showSplash && <AnimatedSplashScreen ready={isReady} onFinish={handleSplashFinish} />}
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const t = useTheme();
  useForegroundMessageHandler();
  usePushTapHandler();

  // Screen transitions (docs/09 §3, tokens in theme/motion.ts). With reduce
  // motion every route switches without animation.
  type StackAnim = 'slide_from_right' | 'slide_from_bottom' | 'fade' | 'fade_from_bottom' | 'ios_from_right' | 'default';
  const anim = (a: StackAnim) => (t.reduceMotion ? ('none' as const) : a);
  // Push: slide from the right with the previous screen drifting behind
  // (parallax) — Android gets the iOS-like transition, iOS its native one.
  const push = anim(Platform.OS === 'android' ? 'ios_from_right' : 'default');
  // Modal-like flows (sell, Boutique Éclair, offer, consent) rise from the bottom.
  const modal = { animation: anim('slide_from_bottom'), animationDuration: duration.screen };
  // Auth steps cross-fade.
  const step = { animation: anim('fade'), animationDuration: duration.medium };

  const navTheme = useMemo<NavTheme>(() => {
    const base = t.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: t.colors.brandStrong,
        background: t.colors.canvas,
        card: t.colors.surface,
        text: t.colors.ink,
        border: t.colors.line,
        notification: t.colors.brand,
      },
    };
  }, [t]);

  return (
    <PhoneAuthProvider>
      <AuthProvider>
        <RealtimeProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar style={t.isDark ? 'light' : 'dark'} />
            {/*
              Transitions (docs/09 §1/§4): pushes slide from the right with
              parallax, modal-like flows rise from the bottom, the item page
              fades in while its photo scales up from 0.96 inside the screen
              (the card "opens"), the deal page fades up, auth steps
              cross-fade. Back gestures stay on. 'none' with reduce motion.
            */}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: t.colors.canvas },
                animation: push,
                animationDuration: duration.screen,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}>
              <Stack.Screen name="index" options={step} />
              <Stack.Screen name="onboarding" options={step} />
              <Stack.Screen name="login" options={step} />
              <Stack.Screen name="signup" options={step} />
              <Stack.Screen name="verify-number" options={step} />
              <Stack.Screen name="set-password" options={step} />
              <Stack.Screen name="setup-profile" options={step} />
              <Stack.Screen name="(tabs)" options={step} />
              <Stack.Screen name="consent" options={{ ...modal, gestureEnabled: false }} />
              <Stack.Screen name="item-details" options={{ animation: anim('fade'), animationDuration: duration.medium }} />
              <Stack.Screen name="deal" options={{ animation: anim('fade_from_bottom'), animationDuration: duration.medium }} />
              <Stack.Screen name="make-offer" options={{ ...modal, presentation: 'modal' }} />
              <Stack.Screen
                name="post-item"
                options={{ ...modal, presentation: 'fullScreenModal', gestureEnabled: false }}
              />
              <Stack.Screen name="boutique-eclair" options={{ ...modal, presentation: 'modal' }} />
              <Stack.Screen name="search" options={{ animation: anim('fade'), animationDuration: duration.medium }} />
              <Stack.Screen name="search-results" options={{ animation: anim('fade_from_bottom'), animationDuration: duration.medium }} />
            </Stack>
            {/* Card photo → item hero flight, above every screen. */}
            <SharedPhotoOverlay />
            {/* Maintenance / update-required pages and the soft update banner. */}
            <OfflineBanner />
            <AppGate />
            <Toast config={toastConfig} />
          </ThemeProvider>
        </RealtimeProvider>
      </AuthProvider>
    </PhoneAuthProvider>
  );
}

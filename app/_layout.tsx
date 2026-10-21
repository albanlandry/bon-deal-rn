import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, Theme as NavTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryClientProvider } from '@tanstack/react-query';

import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import AppGate from '@/components/organisms/AppGate';
import Toast, { toastConfig } from '@/components/atoms/Toast';
import { PhoneAuthProvider } from '@/contexts/PhoneAuthContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { queryClient } from '@/lib/queryClient';
import { useForegroundMessageHandler } from '@/lib/push';
import { AppThemeProvider, useTheme } from '@/theme';

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
  });

  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Keep splash visible for animation duration
      setIsReady(true);
    }
  }, [loaded]);

  const handleSplashFinish = () => {
    setShowSplash(false);
    SplashScreen.hideAsync();
  };

  if (!isReady || showSplash) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <RootLayoutNav />
        </AppThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const t = useTheme();
  useForegroundMessageHandler();

  type StackAnim = 'slide_from_right' | 'slide_from_bottom' | 'fade' | 'fade_from_bottom';
  const anim = (a: StackAnim) => (t.reduceMotion ? ('none' as const) : a);

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
              Transitions (docs/09 §1/§4): pushes slide from the right, sheets
              rise from the bottom, a listing card "expands" into the item page
              (fade here + scale-in inside the screen), search grows in place.
              Everything is 'none' with reduce motion.
            */}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: t.colors.canvas },
                animation: anim('slide_from_right'),
                animationDuration: 300,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
              }}>
              <Stack.Screen name="index" options={{ animation: anim('fade') }} />
              <Stack.Screen name="onboarding" options={{ animation: anim('fade') }} />
              <Stack.Screen name="(tabs)" options={{ animation: anim('fade') }} />
              <Stack.Screen name="consent" options={{ gestureEnabled: false, animation: anim('fade_from_bottom') }} />
              <Stack.Screen name="item-details" options={{ animation: anim('fade'), animationDuration: 250 }} />
              <Stack.Screen
                name="make-offer"
                options={{ presentation: 'modal', animation: anim('slide_from_bottom') }}
              />
              <Stack.Screen
                name="post-item"
                options={{ presentation: 'fullScreenModal', animation: anim('slide_from_bottom'), gestureEnabled: false }}
              />
              <Stack.Screen name="boutique-eclair" options={{ presentation: 'modal', animation: anim('slide_from_bottom') }} />
              <Stack.Screen name="search" options={{ animation: anim('fade'), animationDuration: 250 }} />
              <Stack.Screen name="search-results" options={{ animation: anim('fade_from_bottom') }} />
              <Stack.Screen name="notifications" options={{ animation: anim('slide_from_right') }} />
            </Stack>
            {/* Maintenance / update-required pages and the soft update banner. */}
            <AppGate />
            <Toast config={toastConfig} />
          </ThemeProvider>
        </RealtimeProvider>
      </AuthProvider>
    </PhoneAuthProvider>
  );
}

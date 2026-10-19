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
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: t.colors.canvas },
                animation: t.reduceMotion ? 'none' : 'default',
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" options={{ animation: t.reduceMotion ? 'none' : 'fade' }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="consent" options={{ gestureEnabled: false }} />
              <Stack.Screen name="make-offer" options={{ presentation: 'modal' }} />
              <Stack.Screen name="post-item" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen
                name="search"
                options={{ animation: t.reduceMotion ? 'none' : 'fade', animationDuration: 200 }}
              />
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

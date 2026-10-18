import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';
import { useTheme } from '@/theme';

export default function SplashDemoScreen() {
  const t = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  const handleSplashFinish = () => {
    setShowSplash(false);
    // Go back to previous screen or to home
    setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/home');
    }, t.duration(300));
  };

  if (showSplash) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  return <View style={{ flex: 1, backgroundColor: t.colors.canvas }} />;
}

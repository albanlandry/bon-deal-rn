import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import AnimatedSplashScreen from '../components/AnimatedSplashScreen';

export default function SplashDemoScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  const handleSplashFinish = () => {
    setShowSplash(false);
    // Go back to previous screen or to home
    setTimeout(() => {
      router.back();
    }, 300);
  };

  if (showSplash) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  return <View style={{ flex: 1 }} />;
}


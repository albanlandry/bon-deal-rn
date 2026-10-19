/**
 * Entry gate: signed-in users go to the feed; first-time visitors see the
 * 3-slide onboarding (MB-AUTH-07); everyone else goes to login.
 * Uses the (cached) JWT, not the profile, so a cold start without network
 * doesn't bounce a signed-in user to the login screen.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme';

export const ONBOARDING_KEY = 'bondeal.onboarding.seen';

export default function Index() {
  const t = useTheme();
  const { jwt, isLoading } = useAuth();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setSeen(v === '1'))
      .catch(() => setSeen(true));
  }, []);

  if (isLoading || seen === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.canvas }}>
        <ActivityIndicator color={t.colors.brandStrong} />
      </View>
    );
  }
  if (jwt) return <Redirect href="/(tabs)/home" />;
  if (!seen) return <Redirect href="/onboarding" />;
  return <Redirect href="/login" />;
}

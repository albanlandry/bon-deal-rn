import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '@/components/molecules/EmptyState';
import { useTheme } from '@/theme';

/** Routes that moved: old in-app hrefs land here and are sent on. */
const MOVED: Record<string, '/favorites'> = {
  // Favoris left the tab bar (docs/11 §4.1); it is a stack screen now.
  '(tabs)/favorites': '/favorites',
};

export default function NotFoundScreen() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ 'not-found'?: string | string[] }>();
  const raw = params['not-found'];
  const moved = MOVED[(Array.isArray(raw) ? raw : raw ? [raw] : []).join('/')];
  if (moved) return <Redirect href={moved} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <EmptyState
        icon="compass-outline"
        title="Page introuvable"
        message="Ce lien ne mène nulle part. Revenons aux annonces."
        actionLabel="Retour à l’accueil"
        onAction={() => router.replace('/(tabs)/home')}
      />
    </SafeAreaView>
  );
}

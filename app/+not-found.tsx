import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '@/components/molecules/EmptyState';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const t = useTheme();
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

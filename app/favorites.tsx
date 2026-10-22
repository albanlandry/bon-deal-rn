// app/favorites.tsx — Favoris (stack screen, with back button)
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui';
import FavoritesList from '@/components/organisms/FavoritesList';
import { useTheme } from '@/theme';

export default function FavoritesScreen() {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <ScreenHeader large title="Favoris" />
      <FavoritesList />
    </SafeAreaView>
  );
}

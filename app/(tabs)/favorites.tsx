// app/(tabs)/favorites.tsx — Favoris tab (same cards/grid as Home; the tab
// bar hides on scroll down and returns on scroll up).
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, ScreenHeader, useScrollChrome, useTabBarInset } from '@/components/ui';
import FavoritesList from '@/components/organisms/FavoritesList';
import { useTheme } from '@/theme';

export default function FavoritesTab() {
  const router = useRouter();
  const t = useTheme();
  const chrome = useScrollChrome({ drivesTabBar: true });
  const tabInset = useTabBarInset();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.canvas }} edges={['top']}>
      <ScreenHeader
        title="Favoris"
        large
        back={false}
        right={<IconButton icon="search" label="Rechercher" onPress={() => router.push('/search')} />}
      />
      <FavoritesList onScroll={chrome.onScroll} contentPaddingBottom={tabInset} />
    </SafeAreaView>
  );
}

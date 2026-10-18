import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { BdPost } from '@/constants/types';
import { useTheme } from '@/theme';
import ListingCard, { ListingCardSkeleton } from '../molecules/ListingCard';

const PAD = 16;
const GAP = 12;

export interface ListingGridProps {
  posts: BdPost[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  fetchingMore?: boolean;
  onToggleLike?: (post: BdPost) => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
  showState?: boolean;
}

/** 2-column marketplace grid (Jakob's law) with skeletons + pull-to-refresh. */
export default function ListingGrid({
  posts,
  loading,
  refreshing = false,
  onRefresh,
  onEndReached,
  fetchingMore,
  onToggleLike,
  ListHeaderComponent,
  ListEmptyComponent,
  showState,
}: ListingGridProps) {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - PAD * 2 - GAP) / 2);

  const renderItem = useCallback(
    ({ item }: { item: BdPost | null }) =>
      item ? (
        <ListingCard
          post={item}
          width={cardWidth}
          showState={showState}
          onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
          onToggleLike={onToggleLike ? () => onToggleLike(item) : undefined}
        />
      ) : (
        <ListingCardSkeleton width={cardWidth} />
      ),
    [cardWidth, onToggleLike, router, showState],
  );

  const data: (BdPost | null)[] = loading ? Array(6).fill(null) : posts;

  return (
    <FlatList
      data={data}
      numColumns={2}
      renderItem={renderItem}
      keyExtractor={(item, i) => (item ? String(item.id) : `sk-${i}`)}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, !loading && posts.length === 0 && styles.grow]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={loading ? null : ListEmptyComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
      ListFooterComponent={
        fetchingMore ? <ActivityIndicator style={styles.footer} color={t.colors.brandStrong} /> : <View style={styles.footer} />
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[t.colors.brandStrong]}
            tintColor={t.colors.brandStrong}
            progressBackgroundColor={t.colors.surface}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  grow: { flexGrow: 1 },
  row: { paddingHorizontal: PAD, gap: GAP, marginBottom: GAP },
  footer: { paddingVertical: 16 },
});

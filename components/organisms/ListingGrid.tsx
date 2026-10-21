import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import type { BdPost } from '@/constants/types';
import { useTheme } from '@/theme';
import FadeInView, { useDelayedFlag, useFirstPaint } from '../motion/FadeInView';
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
  /** Scroll passthrough (e.g. `useScrollChrome().onScroll`). */
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  /** Room for an absolute header above / the tab bar below. */
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
}

/** Columns: 2 on phones (docs/09), 3 on wide screens / tablets. */
export function gridColumns(width: number): number {
  return width >= 900 ? 4 : width >= 600 ? 3 : 2;
}

type Cell = BdPost | null;

/**
 * Marketplace grid on FlashList v2 (recycling, fixed 4:5 photos so nothing
 * jumps). First paint staggers the first 8 cards (30 ms); skeletons only
 * when a load takes over ~1 s (NN/g); pull-to-refresh in brand colours.
 */
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
  onScroll,
  scrollEventThrottle,
  contentPaddingTop = 0,
  contentPaddingBottom = 0,
}: ListingGridProps) {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cols = gridColumns(width);
  const cardWidth = Math.floor((width - PAD * 2 - GAP * (cols - 1)) / cols);
  const showSkeletons = useDelayedFlag(!!loading, 1000);
  const firstPaint = useFirstPaint(!loading && posts.length > 0);

  const renderItem = useCallback(
    ({ item, index }: { item: Cell; index: number }) => (
      <View style={styles.cell}>
        {item ? (
          <FadeInView index={index} animate={firstPaint}>
            <ListingCard
              post={item}
              width={cardWidth}
              showState={showState}
              onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
              onToggleLike={onToggleLike ? () => onToggleLike(item) : undefined}
            />
          </FadeInView>
        ) : (
          <ListingCardSkeleton width={cardWidth} />
        )}
      </View>
    ),
    [cardWidth, onToggleLike, router, showState, firstPaint],
  );

  // While loading: nothing for the first second, then card-shaped skeletons.
  const data: Cell[] = loading ? (showSkeletons ? Array(cols * 3).fill(null) : []) : posts;

  return (
    <FlashList
      key={`cols-${cols}`}
      data={data}
      numColumns={cols}
      renderItem={renderItem}
      keyExtractor={(item, i) => (item ? String(item.id) : `sk-${i}`)}
      getItemType={(item) => (item ? 'card' : 'skeleton')}
      contentContainerStyle={{
        paddingHorizontal: PAD - GAP / 2,
        paddingTop: contentPaddingTop,
        paddingBottom: contentPaddingBottom + 24,
      }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent ? <View style={styles.bleed}>{ListHeaderComponent}</View> : null}
      ListEmptyComponent={loading || !ListEmptyComponent ? null : <View style={styles.bleed}>{ListEmptyComponent}</View>}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle ?? (onScroll ? 16 : undefined)}
      ListFooterComponent={
        fetchingMore ? (
          <ActivityIndicator style={styles.footer} color={t.colors.brandStrong} />
        ) : (
          <View style={styles.footer} />
        )
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[t.colors.brandStrong, t.colors.brand]}
            tintColor={t.colors.brandStrong}
            progressBackgroundColor={t.colors.surface}
            progressViewOffset={contentPaddingTop}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  cell: { paddingHorizontal: GAP / 2, paddingBottom: GAP },
  footer: { paddingVertical: 16 },
  bleed: { marginHorizontal: -(PAD - GAP / 2) },
});

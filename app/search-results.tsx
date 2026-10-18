// app/search-results.tsx — Résultats: count, sort, filter sheet, grid.
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  SegmentedControl,
  Sheet,
  showToast,
} from '@/components/ui';
import { CATEGORY_ICONS } from '@/components/molecules/CategorySheet';
import ListingGrid from '@/components/organisms/ListingGrid';
import { CATEGORIES, categoryLabel } from '@/constants/catalog';
import type { BdPost } from '@/constants/types';
import { useToggleLike } from '@/lib/api/likeToggle';
import { postsInfiniteQuery, type PostSort } from '@/lib/api/posts';
import { createStyles, useStyles, useTheme } from '@/theme';

type PriceBucket = 'under50' | '50to100' | 'over100';
type ConditionMode = 'all' | 'like_new' | 'used';

const PRICE_BUCKETS: { id: PriceBucket; label: string }[] = [
  { id: 'under50', label: '< 50 000 FCFA' },
  { id: '50to100', label: '50 000 – 100 000' },
  { id: 'over100', label: '> 100 000 FCFA' },
];

const CONDITION_MODES: { id: ConditionMode; label: string }[] = [
  { id: 'all', label: 'Tous états' },
  { id: 'like_new', label: 'Comme neuf' },
  { id: 'used', label: 'Occasion' },
];

const SORT_SEGMENTS: { value: PostSort; label: string }[] = [
  { value: 'date_new', label: 'Récents' },
  { value: 'price_low', label: 'Prix ↑' },
  { value: 'price_high', label: 'Prix ↓' },
];
const ALL_SORTS: PostSort[] = ['date_new', 'date_old', 'price_low', 'price_high'];

// Which bucket a raw min/max range best corresponds to (for chip highlighting).
function bucketFromRange(min?: number, max?: number): PriceBucket | null {
  if (max != null && max <= 50000 && (min == null || min <= 0)) return 'under50';
  if (min != null && min >= 100000 && max == null) return 'over100';
  if (min === 50000 && max === 100000) return '50to100';
  return null;
}

const BUCKET_RANGE: Record<PriceBucket, { min?: number; max?: number }> = {
  under50: { max: 50000 },
  '50to100': { min: 50000, max: 100000 },
  over100: { min: 100000 },
};

function modeFromConds(conds: string[]): ConditionMode {
  if (conds.length > 0 && conds.every((c) => c === 'excellent')) return 'like_new';
  if (conds.some((c) => ['good', 'fair', 'poor'].includes(c))) return 'used';
  return 'all';
}

interface Filters {
  category: string | null;
  minPrice?: number;
  maxPrice?: number;
  conditionMode: ConditionMode;
}

export default function SearchResultsScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{
    query?: string;
    category?: string;
    categories?: string;
    minPrice?: string;
    maxPrice?: string;
    condition?: string;
    sort?: string;
  }>();
  const query = params.query ?? '';

  const [filters, setFilters] = useState<Filters>(() => ({
    category: params.category ?? params.categories?.split(',')[0] ?? null,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    conditionMode: modeFromConds(params.condition ? params.condition.split(',') : []),
  }));
  const [sort, setSort] = useState<PostSort>(
    ALL_SORTS.includes(params.sort as PostSort) ? (params.sort as PostSort) : 'date_new',
  );
  const [showSheet, setShowSheet] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  const condition =
    filters.conditionMode === 'like_new'
      ? ['excellent']
      : filters.conditionMode === 'used'
        ? ['good', 'fair', 'poor']
        : undefined;

  const feed = useInfiniteQuery(
    postsInfiniteQuery({
      search: query || undefined,
      categories: filters.category ? [filters.category] : undefined,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      condition,
      sort,
    }),
  );
  const results = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const total = feed.data?.pages[0]?.total_posts ?? 0;

  const toggleLike = useToggleLike((e: any) =>
    showToast.error('Échec', e?.message || 'Impossible de modifier vos favoris.'),
  );
  const onToggleLike = useCallback(
    (p: BdPost) => toggleLike.mutate({ id: p.id, like: !p.liked_by_me }),
    [toggleLike],
  );

  const activeBucket = bucketFromRange(filters.minPrice, filters.maxPrice);
  const activeCount =
    (filters.category ? 1 : 0) +
    (filters.minPrice != null || filters.maxPrice != null ? 1 : 0) +
    (filters.conditionMode !== 'all' ? 1 : 0);

  const emptyFilters: Filters = { category: null, minPrice: undefined, maxPrice: undefined, conditionMode: 'all' };
  const resetFilters = () => {
    setFilters(emptyFilters);
    setDraft(emptyFilters);
    setSort('date_new');
  };

  const openSheet = () => {
    setDraft(filters);
    setShowSheet(true);
  };

  const draftBucket = bucketFromRange(draft.minPrice, draft.maxPrice);
  const setDraftBucket = (b: PriceBucket) =>
    setDraft((d) =>
      draftBucket === b
        ? { ...d, minPrice: undefined, maxPrice: undefined }
        : { ...d, minPrice: BUCKET_RANGE[b].min, maxPrice: BUCKET_RANGE[b].max },
    );

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.category)
    activeChips.push({ key: 'cat', label: categoryLabel(filters.category), clear: () => setFilters((f) => ({ ...f, category: null })) });
  if (filters.minPrice != null || filters.maxPrice != null)
    activeChips.push({
      key: 'price',
      label: activeBucket ? PRICE_BUCKETS.find((b) => b.id === activeBucket)!.label : 'Prix personnalisé',
      clear: () => setFilters((f) => ({ ...f, minPrice: undefined, maxPrice: undefined })),
    });
  if (filters.conditionMode !== 'all')
    activeChips.push({
      key: 'cond',
      label: CONDITION_MODES.find((m) => m.id === filters.conditionMode)!.label,
      clear: () => setFilters((f) => ({ ...f, conditionMode: 'all' })),
    });

  const showError = feed.isError && results.length === 0 && !feed.isLoading;

  const header = (
    <View style={s.listHeader}>
      <SegmentedControl
        segments={SORT_SEGMENTS}
        value={sort}
        onChange={setSort}
        accessibilityLabel="Trier les résultats"
      />
      {activeChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.activeRow}>
          {activeChips.map((c) => (
            <Chip key={c.key} label={c.label} selected kind="action" trailingIcon="close" onPress={c.clear} />
          ))}
        </ScrollView>
      )}
      <AppText variant="small" color="inkMuted" accessibilityLiveRegion="polite" style={s.count}>
        {feed.isLoading ? 'Recherche…' : `${total} résultat${total > 1 ? 's' : ''}`}
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <IconButton icon="arrow-back" label="Retour" onPress={() => router.back()} />
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={query ? `Recherche : ${query}. Modifier` : 'Rechercher'}
          onPress={() => router.push('/search')}
          style={s.queryPill}>
          <Ionicons name="search" size={18} color={t.colors.inkMuted} />
          <AppText variant="body" numberOfLines={1} style={s.flex} color={query ? 'ink' : 'inkSubtle'}>
            {query || 'Parcourir les annonces'}
          </AppText>
        </Pressable>
        <IconButton
          icon="options-outline"
          label="Filtres"
          variant="tonal"
          badge={activeCount}
          onPress={openSheet}
        />
      </View>

      {showError ? (
        <ErrorState message="La recherche n’a pas abouti." onRetry={() => feed.refetch()} />
      ) : (
        <ListingGrid
          posts={results}
          loading={feed.isLoading}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => feed.refetch()}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          fetchingMore={feed.isFetchingNextPage}
          onToggleLike={onToggleLike}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Aucun résultat"
              message={
                query ? `Aucune annonce pour « ${query} ».` : 'Aucune annonce ne correspond à ces filtres.'
              }
              actionLabel={activeCount > 0 ? 'Réinitialiser les filtres' : 'Nouvelle recherche'}
              onAction={activeCount > 0 ? resetFilters : () => router.push('/search')}
            />
          }
        />
      )}

      {/* Filter bottom sheet — 3 groups (Hick) */}
      <Sheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title="Filtres"
        footer={
          <View style={s.sheetActions}>
            <Button label="Effacer" variant="secondary" onPress={() => setDraft(emptyFilters)} style={s.flex} />
            <Button
              label="Appliquer"
              onPress={() => {
                setFilters(draft);
                setShowSheet(false);
              }}
              style={s.flex}
            />
          </View>
        }>
        <AppText variant="labelStrong" style={s.groupTitle}>
          Catégorie
        </AppText>
        <View style={s.wrap}>
          <Chip label="Toutes" selected={!draft.category} onPress={() => setDraft((d) => ({ ...d, category: null }))} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              icon={CATEGORY_ICONS[c.value]}
              selected={draft.category === c.value}
              onPress={() => setDraft((d) => ({ ...d, category: d.category === c.value ? null : c.value }))}
            />
          ))}
        </View>

        <AppText variant="labelStrong" style={s.groupTitle}>
          Prix
        </AppText>
        <View style={s.wrap}>
          {PRICE_BUCKETS.map((b) => (
            <Chip key={b.id} label={b.label} selected={draftBucket === b.id} onPress={() => setDraftBucket(b.id)} />
          ))}
        </View>

        <AppText variant="labelStrong" style={s.groupTitle}>
          État
        </AppText>
        <View style={s.wrap}>
          {CONDITION_MODES.map((m) => (
            <Chip
              key={m.id}
              label={m.label}
              selected={draft.conditionMode === m.id}
              onPress={() => setDraft((d) => ({ ...d, conditionMode: m.id }))}
            />
          ))}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: t.spacing.xxs,
  },
  queryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: 48,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  listHeader: { paddingHorizontal: t.spacing.md, paddingTop: t.spacing.xs, gap: t.spacing.xs },
  activeRow: { gap: t.spacing.xs },
  count: { paddingBottom: t.spacing.xs },
  groupTitle: { marginTop: t.spacing.md, marginBottom: t.spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  sheetActions: { flexDirection: 'row', gap: t.spacing.sm },
}));


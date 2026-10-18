// app/(tabs)/home.tsx — Accueil: quartier, search, categories, resume-draft, feed.
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppImage,
  AppText,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  QuartierPickerSheet,
  showToast,
} from '@/components/ui';
import CategorySheet, { CATEGORY_ICONS, TOP_CATEGORIES } from '@/components/molecules/CategorySheet';
import ListingGrid from '@/components/organisms/ListingGrid';
import { categoryLabel } from '@/constants/catalog';
import type { BdPost } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleLike } from '@/lib/api/likeToggle';
import { unreadCountQuery } from '@/lib/api/notifications';
import { postsInfiniteQuery } from '@/lib/api/posts';
import { formatRelativeTime } from '@/lib/format';
import { sellDraftQuery } from '@/lib/sellDraft';
import { createStyles, useStyles, useTheme } from '@/theme';

const SELL_STEPS = 4;

export default function HomeScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [category, setCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showQuartier, setShowQuartier] = useState(false);

  // Real paginated feed, scoped server-side to the user's city.
  const feed = useInfiniteQuery(
    postsInfiniteQuery({ categories: category ? [category] : undefined }),
  );
  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const { data: unreadCount = 0 } = useQuery({ ...unreadCountQuery(), enabled: isAuthenticated });
  const { data: draft } = useQuery(sellDraftQuery());

  const toggleLike = useToggleLike((e: any) =>
    showToast.error('Échec', e?.message || 'Impossible de modifier vos favoris.'),
  );
  const onToggleLike = useCallback(
    (p: BdPost) => toggleLike.mutate({ id: p.id, like: !p.liked_by_me }),
    [toggleLike],
  );

  const location = user?.quartier || user?.city || 'Choisir mon quartier';

  // Chip row: Tout + 6 top categories (+ the current one if picked from "Plus") + Plus.
  const chips = useMemo(() => {
    const ids = [...TOP_CATEGORIES];
    if (category && !ids.includes(category)) ids.unshift(category);
    return ids;
  }, [category]);

  const header = (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}>
        <Chip
          label="Tout"
          icon={CATEGORY_ICONS.all}
          selected={category === null}
          onPress={() => setCategory(null)}
        />
        {chips.map((id) => (
          <Chip
            key={id}
            label={categoryLabel(id)}
            icon={CATEGORY_ICONS[id]}
            selected={category === id}
            onPress={() => setCategory(category === id ? null : id)}
          />
        ))}
        <Chip
          label="Plus"
          kind="action"
          trailingIcon="chevron-down"
          onPress={() => setShowCategories(true)}
        />
      </ScrollView>

      {draft && (
        <Card
          tone="brand"
          onPress={() => router.push('/post-item')}
          accessibilityLabel="Terminer votre annonce"
          style={s.draftCard}>
          <View style={s.draftRow}>
            {draft.images?.[0] ? (
              <AppImage uri={draft.images[0]} style={s.draftThumb} />
            ) : (
              <View style={[s.draftThumb, s.draftThumbEmpty]}>
                <Ionicons name="create-outline" size={22} color={t.colors.brandStrong} />
              </View>
            )}
            <View style={s.flex}>
              <AppText variant="labelStrong">Terminer votre annonce</AppText>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {draft.title?.trim() ? `« ${draft.title.trim()} » · ` : ''}
                Étape {Math.min((draft.step ?? 0) + 1, SELL_STEPS)} sur {SELL_STEPS}
                {draft.updatedAt ? ` · ${formatRelativeTime(draft.updatedAt).toLowerCase()}` : ''}
              </AppText>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${(Math.min((draft.step ?? 0) + 1, SELL_STEPS) / SELL_STEPS) * 100}%` },
                  ]}
                />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.colors.brandStrong} />
          </View>
        </Card>
      )}

      <AppText variant="h3" style={s.sectionTitle} accessibilityRole="header">
        {category ? categoryLabel(category) : user?.city ? `Annonces à ${user.city}` : 'Annonces récentes'}
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header: quartier chip + notifications */}
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quartier : ${location}. Changer de quartier`}
          onPress={() => setShowQuartier(true)}
          style={({ pressed }) => [s.locationChip, pressed && { opacity: 0.8 }]}>
          <Ionicons name="location" size={18} color={t.colors.brandStrong} />
          <View style={s.flexShrink}>
            <AppText variant="caption" color="inkMuted">
              Près de
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {location}
            </AppText>
          </View>
          <Ionicons name="chevron-down" size={16} color={t.colors.inkMuted} />
        </Pressable>
        <IconButton
          icon="notifications-outline"
          label="Notifications"
          badge={unreadCount}
          variant="tonal"
          onPress={() => router.push('/notifications')}
        />
      </View>

      {/* Search bar */}
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Rechercher une annonce"
        onPress={() => router.push('/search')}
        style={({ pressed }) => [s.searchBar, pressed && { opacity: 0.85 }]}>
        <Ionicons name="search" size={20} color={t.colors.inkMuted} />
        <AppText variant="body" color="inkSubtle" style={s.flex} numberOfLines={1}>
          Rechercher un article…
        </AppText>
        <View style={s.aiPill}>
          <Ionicons name="sparkles" size={14} color={t.colors.brandStrong} />
          <AppText variant="captionStrong" color="brandStrong">
            Trouve-moi ça
          </AppText>
        </View>
      </Pressable>

      {feed.isError && posts.length === 0 && !feed.isLoading ? (
        <ErrorState message="Impossible de charger les annonces." onRetry={() => feed.refetch()} />
      ) : (
        <ListingGrid
          posts={posts}
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
              icon="pricetags-outline"
              title={category ? 'Rien dans cette catégorie' : 'Aucune annonce dans votre ville'}
              message={
                category
                  ? 'Essayez une autre catégorie, ou soyez le premier à y vendre.'
                  : 'Soyez le premier à vendre près de chez vous.'
              }
              actionLabel="Publier une annonce"
              onAction={() => router.push('/post-item')}
              secondaryLabel={category ? 'Voir toutes les catégories' : undefined}
              onSecondary={category ? () => setCategory(null) : undefined}
            />
          }
        />
      )}

      <CategorySheet
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        selected={category}
        onSelect={setCategory}
      />
      <QuartierPickerSheet visible={showQuartier} onClose={() => setShowQuartier(false)} />
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.xs,
    gap: t.spacing.sm,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: 48,
    flexShrink: 1,
    paddingRight: t.spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: 48,
    marginHorizontal: t.spacing.md,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
    paddingLeft: t.spacing.md,
    paddingRight: 6,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.brandTint,
  },
  chips: { gap: t.spacing.xs, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.xs },
  draftCard: { marginHorizontal: t.spacing.md, marginTop: t.spacing.xs },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  draftThumb: { width: 52, height: 52, borderRadius: t.radius.sm },
  draftThumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.surface },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: t.colors.brand },
  sectionTitle: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.sm,
  },
}));

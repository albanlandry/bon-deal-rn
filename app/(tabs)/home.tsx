// app/(tabs)/home.tsx — Accueil (docs/09 §4 Home): collapsing header
// (location + bell + scope, then a sticky search pill + category row), a
// resume-draft card, and the FlashList feed. Scrolling down collapses the
// header to the search pill and slides the tab bar away; scrolling up brings
// both back.
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedHeader,
  AppImage,
  AppText,
  CategoryRow,
  CategorySheet,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  PressableScale,
  ProgressBar,
  QuartierPickerSheet,
  SegmentedControl,
  showToast,
  SwipeRow,
  useScrollChrome,
  useTabBarInset,
} from '@/components/ui';
import { enterFromTop, exitUp, layoutEase } from '@/components/motion/anim';
import ListingGrid from '@/components/organisms/ListingGrid';
import { categoryLabel, TOP_CATEGORIES } from '@/constants/catalog';
import type { BdPost } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleLike } from '@/lib/api/likeToggle';
import { unreadCountQuery } from '@/lib/api/notifications';
import { postsInfiniteQuery, type FeedParams, type NearParams } from '@/lib/api/posts';
import { getCurrentCoords, LOCATION_MESSAGES } from '@/lib/location';
import { formatRelativeTime } from '@/lib/format';
import { sellDraftQuery } from '@/lib/sellDraft';
import { createStyles, useStyles, useTheme } from '@/theme';

const SELL_STEPS = 4;
const NEAR_RADIUS_KM = 5;

type Scope = 'city' | 'quartier' | 'near';

export default function HomeScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const chrome = useScrollChrome({ drivesTabBar: true });
  const [headerH, setHeaderH] = useState(0);
  const { user, isAuthenticated } = useAuth();

  const [category, setCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showQuartier, setShowQuartier] = useState(false);
  const [scope, setScope] = useState<Scope>('city');
  const [near, setNear] = useState<NearParams | null>(null);
  const [locating, setLocating] = useState(false);
  // Session-only dismissal of the resume card (the draft itself is kept).
  const [hiddenDraftAt, setHiddenDraftAt] = useState<string | null>(null);

  // Real paginated feed, scoped server-side to the user's city, optionally
  // narrowed to the home quartier or to "Près de moi" (nearest first).
  const effectiveScope: Scope =
    scope === 'quartier' && !user?.quartier ? 'city' : scope === 'near' && !near ? 'city' : scope;
  const feedParams: FeedParams = {
    categories: category ? [category] : undefined,
    quartier: effectiveScope === 'quartier' ? user!.quartier! : undefined,
    near: effectiveScope === 'near' ? near! : undefined,
    sort: effectiveScope === 'near' ? 'distance' : undefined,
  };
  const feed = useInfiniteQuery(postsInfiniteQuery(feedParams));

  const pickNearMe = async () => {
    if (locating) return;
    setLocating(true);
    const res = await getCurrentCoords();
    setLocating(false);
    if (!res.ok) {
      const m = LOCATION_MESSAGES[res.reason];
      showToast.error(m.title, m.message);
      return;
    }
    setNear({ ...res.coords, radiusKm: NEAR_RADIUS_KM });
    setScope('near');
  };
  const onScopeChange = (v: Scope) => {
    if (v === 'near') pickNearMe();
    else if (v === 'quartier' && !user?.quartier) setShowQuartier(true);
    else setScope(v);
  };

  const posts = useMemo(() => feed.data?.pages.flatMap((p) => p.posts) ?? [], [feed.data]);
  const { data: unreadCount = 0 } = useQuery({ ...unreadCountQuery(), enabled: isAuthenticated });
  const { data: draft } = useQuery(sellDraftQuery());
  const showDraft = !!draft && hiddenDraftAt !== (draft.updatedAt ?? '');

  const toggleLike = useToggleLike((e: any) =>
    showToast.error('Échec', e?.message || 'Impossible de modifier vos favoris.'),
  );
  const onToggleLike = useCallback(
    (p: BdPost) => toggleLike.mutate({ id: p.id, like: !p.liked_by_me }),
    [toggleLike],
  );

  const location = user?.quartier || user?.city || (user ? 'Choisir ma ville' : 'Choisir mon quartier');

  // Category row: Tout + 6 top categories (+ the current one if picked from "Plus").
  const rowItems = useMemo(() => {
    const ids = [...TOP_CATEGORIES];
    if (category && !ids.includes(category)) ids.unshift(category);
    return [{ value: null }, ...ids.map((value) => ({ value }))];
  }, [category]);

  const collapsible = (
    <View>
      <View style={s.header}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Lieu : ${location}${user?.quartier && user?.city ? `, ${user.city}` : ''}. Changer de ville ou de quartier`}
          onPress={() => setShowQuartier(true)}
          style={s.locationChip}>
          <View style={s.locationIcon}>
            <Ionicons name="location" size={18} color={t.colors.brandStrong} />
          </View>
          <View style={s.flexShrink}>
            <AppText variant="caption" color="inkMuted">
              Près de
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {location}
            </AppText>
          </View>
          <Ionicons name="chevron-down" size={16} color={t.colors.inkMuted} />
        </PressableScale>
        <IconButton
          icon="notifications-outline"
          label="Notifications"
          badge={unreadCount}
          variant="tonal"
          onPress={() => router.push('/notifications')}
        />
      </View>
      <View style={s.scope}>
        <SegmentedControl<Scope>
          accessibilityLabel="Zone des annonces"
          value={effectiveScope}
          onChange={onScopeChange}
          segments={[
            { value: 'city', label: 'Toute la ville' },
            { value: 'quartier', label: user?.quartier || 'Mon quartier' },
            { value: 'near', label: locating ? 'Localisation…' : 'Près de moi' },
          ]}
        />
      </View>
    </View>
  );

  const sticky = (
    <View>
      <PressableScale
        accessibilityRole="search"
        accessibilityLabel="Rechercher une annonce"
        onPress={() => router.push('/search')}
        style={[s.searchBar, t.elevation.card as object]}>
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
      </PressableScale>
      <CategoryRow
        items={rowItems}
        selected={category}
        onSelect={setCategory}
        trailing={
          <Chip label="Plus" kind="action" trailingIcon="chevron-down" onPress={() => setShowCategories(true)} />
        }
      />
    </View>
  );

  const draftStep = Math.min((draft?.step ?? 0) + 1, SELL_STEPS);
  const listHeader = (
    <Animated.View layout={layoutEase()}>
      {showDraft && draft && (
        <Animated.View entering={enterFromTop()} exiting={exitUp()} style={s.draftWrap}>
          <SwipeRow
            style={s.draftSwipe}
            left={{
              label: 'Masquer',
              icon: 'eye-off-outline',
              color: t.colors.surfaceAlt,
              onColor: t.colors.ink,
              onAction: () => setHiddenDraftAt(draft.updatedAt ?? ''),
            }}
            right={{
              label: 'Masquer',
              icon: 'eye-off-outline',
              color: t.colors.surfaceAlt,
              onColor: t.colors.ink,
              onAction: () => setHiddenDraftAt(draft.updatedAt ?? ''),
            }}>
            <PressableScale
              onPress={() => router.push('/post-item')}
              accessibilityRole="button"
              accessibilityLabel={`Terminer votre annonce, étape ${draftStep} sur ${SELL_STEPS}`}
              accessibilityHint="Glissez pour masquer"
              style={s.draftCard}>
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
                  Étape {draftStep} sur {SELL_STEPS}
                  {draft.updatedAt ? ` · ${formatRelativeTime(draft.updatedAt).toLowerCase()}` : ''}
                </AppText>
                <ProgressBar
                  progress={draftStep / SELL_STEPS}
                  style={s.progress}
                  trackColor={t.colors.surface}
                  accessibilityLabel="Progression de l’annonce"
                />
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.colors.brandStrong} />
            </PressableScale>
          </SwipeRow>
        </Animated.View>
      )}

      <AppText variant="h3" style={s.sectionTitle} accessibilityRole="header">
        {effectiveScope === 'near'
          ? `${category ? categoryLabel(category) : 'Annonces'} à moins de ${NEAR_RADIUS_KM} km`
          : effectiveScope === 'quartier'
            ? `${category ? categoryLabel(category) : 'Annonces'} à ${user?.quartier}`
            : category
              ? categoryLabel(category)
              : user?.city
                ? `Annonces à ${user.city}`
                : 'Annonces récentes'}
      </AppText>
    </Animated.View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.clip}>
        {feed.isError && posts.length === 0 && !feed.isLoading ? (
          <View style={[s.flex, { paddingTop: headerH }]}>
            <ErrorState message="Impossible de charger les annonces." onRetry={() => feed.refetch()} />
          </View>
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
            onScroll={chrome.onScroll}
            scrollEventThrottle={chrome.scrollEventThrottle}
            contentPaddingTop={headerH}
            contentPaddingBottom={tabInset}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <EmptyState
                icon="pricetags-outline"
                title={
                  category
                    ? 'Rien dans cette catégorie'
                    : effectiveScope === 'near'
                      ? 'Rien près de vous'
                      : effectiveScope === 'quartier'
                        ? 'Aucune annonce dans votre quartier'
                        : 'Aucune annonce dans votre ville'
                }
                message={
                  category
                    ? 'Essayez une autre catégorie, ou soyez le premier à y vendre.'
                    : effectiveScope === 'near'
                      ? `Aucune annonce localisée à moins de ${NEAR_RADIUS_KM} km.`
                      : 'Soyez le premier à vendre près de chez vous.'
                }
                actionLabel="Publier une annonce"
                onAction={() => router.push('/post-item')}
                secondaryLabel={
                  category ? 'Voir toutes les catégories' : effectiveScope !== 'city' ? 'Voir toute la ville' : undefined
                }
                onSecondary={
                  category ? () => setCategory(null) : effectiveScope !== 'city' ? () => setScope('city') : undefined
                }
              />
            }
          />
        )}
        <AnimatedHeader progress={chrome.progress} collapsible={collapsible} sticky={sticky} onHeight={setHeaderH} />
      </View>

      <CategorySheet
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        selected={category}
        onSelect={setCategory}
      />
      <QuartierPickerSheet visible={showQuartier} onClose={() => setShowQuartier(false)} />
    </View>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  clip: { flex: 1, overflow: 'hidden' },
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
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.brandTint,
  },
  scope: { paddingHorizontal: t.spacing.md, paddingTop: t.spacing.xs, paddingBottom: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: 52,
    marginHorizontal: t.spacing.md,
    marginTop: t.spacing.xs,
    marginBottom: 2,
    paddingLeft: t.spacing.md,
    paddingRight: 6,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surface,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.brandTint,
  },
  draftWrap: { marginHorizontal: t.spacing.md, marginTop: t.spacing.sm },
  draftSwipe: { borderRadius: t.radius.md },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    backgroundColor: t.colors.brandTint,
  },
  draftThumb: { width: 52, height: 52, borderRadius: t.radius.sm },
  draftThumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.surface },
  progress: { marginTop: 8 },
  sectionTitle: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.sm,
  },
}));


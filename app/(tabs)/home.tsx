// app/(tabs)/home.tsx — Accueil (docs/12 "Accueil, haut de page" / "en
// défilant", direction B, tight corners). Top of page: location chip (→ zone
// sheet) + bell, a large headline, the search bar with a dark "IA" button
// (→ Rechercher tab), the "Nouveau près de vous" carousel (newest listings
// with a photo in the current scope), the category mosaic, the resume-draft
// card, the quick filters and the masonry feed. Once scrolled past the
// search bar a compact bar (quartier + search) fades in; past the quick
// filters they stay pinned under it. The floating dock hides on scroll down
// and returns on scroll up (docs/09).
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppImage from '@/components/atoms/AppImage';
import AppText from '@/components/atoms/AppText';
import EmptyState, { ErrorState } from '@/components/molecules/EmptyState';
import IconButton from '@/components/atoms/IconButton';
import { showToast } from '@/components/atoms/Toast';
import { enterFromTop, exitUp, layoutEase, timing } from '@/components/motion/anim';
import { useTabBarInset } from '@/components/motion/AnimatedTabBar';
import PressableScale from '@/components/motion/PressableScale';
import ProgressBar from '@/components/motion/ProgressBar';
import { useScrollChrome } from '@/components/motion/ScrollChrome';
import SwipeRow from '@/components/motion/SwipeRow';
import CategoryMosaic from '@/components/molecules/CategoryMosaic';
import CategorySheet from '@/components/molecules/CategorySheet';
import ListingCard from '@/components/molecules/ListingCard';
import QuickFilterRow, { CHEAP_MAX_PRICE, type QuickFilter } from '@/components/molecules/QuickFilterRow';
import HomeScopeSheet, { type HomeScope } from '@/components/organisms/HomeScopeSheet';
import ListingGrid from '@/components/organisms/ListingGrid';
import QuartierPickerSheet from '@/components/organisms/QuartierPickerSheet';
import { TOP_CATEGORIES } from '@/constants/catalog';
import type { BdPost } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToggleLike } from '@/lib/api/likeToggle';
import { unreadCountQuery } from '@/lib/api/notifications';
import { postsInfiniteQuery, type FeedParams, type NearParams } from '@/lib/api/posts';
import { formatRelativeTime } from '@/lib/format';
import { coverThumb } from '@/lib/images';
import { getCurrentCoords, LOCATION_MESSAGES } from '@/lib/location';
import { SELL_STEP_COUNT, sellDraftQuery } from '@/lib/sellDraft';
import { createStyles, font, useStyles, useTheme } from '@/theme';
import { duration } from '@/theme/motion';

const NEAR_RADIUS_KM = 5;
/** Compact bar height once the page is scrolled. */
const COMPACT_H = 52;
const HERO_H = 176;
const HERO_GAP = 12;
/** Hero carousel: newest listings with a photo, at most this many. */
const HERO_MAX = 6;
/** Mosaic: 1 large + 3 small + "Tout voir". */
const MOSAIC_CATEGORIES = TOP_CATEGORIES.slice(0, 4);

type Scope = HomeScope;

export default function HomeScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabInset = useTabBarInset();
  const chrome = useScrollChrome({ drivesTabBar: true });
  const { user, isAuthenticated } = useAuth();

  const [quick, setQuick] = useState<QuickFilter>('recent');
  const [showCategories, setShowCategories] = useState(false);
  const [showQuartier, setShowQuartier] = useState(false);
  const [showScope, setShowScope] = useState(false);
  const [scope, setScope] = useState<Scope>('city');
  const [near, setNear] = useState<NearParams | null>(null);
  const [locating, setLocating] = useState(false);
  // Session-only dismissal of the resume card (the draft itself is kept).
  const [hiddenDraftAt, setHiddenDraftAt] = useState<string | null>(null);

  // Feed scope: the user's city (server-side), optionally the home quartier
  // or "Près de moi" (nearest first). The quick filter narrows it further.
  const effectiveScope: Scope =
    scope === 'quartier' && !user?.quartier ? 'city' : scope === 'near' && !near ? 'city' : scope;
  const scopeParams: FeedParams = {
    quartier: effectiveScope === 'quartier' ? user!.quartier! : undefined,
    near: effectiveScope === 'near' ? near! : undefined,
    sort: effectiveScope === 'near' ? 'distance' : undefined,
  };
  // Both quick filters are server filters (max_price / is_free), so each has
  // its own query key, pagination and pull-to-refresh.
  const feedParams: FeedParams =
    quick === 'cheap'
      ? { ...scopeParams, maxPrice: CHEAP_MAX_PRICE }
      : quick === 'free'
        ? { ...scopeParams, isFree: true }
        : scopeParams;
  const feed = useInfiniteQuery(postsInfiniteQuery(feedParams));
  // Same query key as the feed on "Récent": no extra request.
  const scopeFeed = useInfiniteQuery(postsInfiniteQuery(scopeParams));

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
  // The zone sheet closes first so only one modal is up at a time.
  const openQuartierPicker = () => {
    setShowScope(false);
    setTimeout(() => setShowQuartier(true), 220);
  };
  const onScopeChange = (v: Scope) => {
    if (v === 'quartier' && !user?.quartier) {
      openQuartierPicker();
      return;
    }
    setShowScope(false);
    if (v === 'near') pickNearMe();
    else setScope(v);
  };
  const toggleNear = () => {
    if (effectiveScope === 'near') setScope(user?.quartier && scope === 'quartier' ? 'quartier' : 'city');
    else pickNearMe();
  };

  const openSearch = (ai = false) =>
    router.navigate({
      pathname: '/(tabs)/search',
      params: ai ? { focus: String(Date.now()), ai: '1' } : { focus: String(Date.now()) },
    });

  // Carousel: newest listings with a photo in the scope (no "à la une" or
  // "vérifié" label — there is no such data).
  const hero = useMemo(() => {
    const first = scopeFeed.data?.pages[0]?.posts ?? [];
    return first
      .filter((p) => !!coverThumb(p.images))
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, HERO_MAX);
  }, [scopeFeed.data]);
  const showHero = hero.length >= 2;

  const posts = useMemo(() => {
    const all = feed.data?.pages.flatMap((p) => p.posts) ?? [];
    // Don't show the carousel's listings twice, unless that empties the feed.
    if (quick === 'recent' && showHero) {
      const ids = new Set(hero.map((p) => p.id));
      const rest = all.filter((p) => !ids.has(p.id));
      return rest.length >= 4 ? rest : all;
    }
    return all;
  }, [feed.data, quick, hero, showHero]);

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

  const place = user?.quartier || user?.city || null;
  const locationLabel =
    user?.quartier && user?.city ? `${user.quartier} · ${user.city}` : place ?? (user ? 'Choisir ma ville' : 'Choisir mon quartier');
  const scopeCaption = locating
    ? 'Localisation…'
    : effectiveScope === 'near'
      ? `Près de moi, ${NEAR_RADIUS_KM} km`
      : effectiveScope === 'quartier'
        ? 'Dans votre quartier'
        : 'Toute la ville';
  const where =
    effectiveScope === 'near'
      ? `à moins de ${NEAR_RADIUS_KM} km`
      : effectiveScope === 'quartier'
        ? `à ${user?.quartier}`
        : user?.city
          ? `à ${user.city}`
          : null;
  const lead = quick === 'free' ? 'Gratuit' : quick === 'cheap' ? 'Moins de 50 000 F' : 'Récent';
  const feedTitle = where ? `${lead} ${where}` : quick === 'recent' ? 'Annonces récentes' : lead;

  const browseCategory = (value: string | null) =>
    router.push({ pathname: '/search-results', params: value ? { category: value } : {} });
  const seeAllNew = () => {
    const params: Record<string, string> = { sort: 'date_new' };
    if (effectiveScope === 'quartier' && user?.quartier) params.quartier = user.quartier;
    if (effectiveScope === 'near' && near) {
      params.nearLat = String(near.lat);
      params.nearLng = String(near.lng);
      params.radiusKm = String(near.radiusKm);
    }
    router.push({ pathname: '/search-results', params });
  };

  // ── Scroll: compact bar + pinned quick filters (JS threshold, UI-thread
  // fades; state only changes when a threshold is crossed).
  const [compactAt, setCompactAt] = useState(160);
  const [chipsY, setChipsY] = useState(0);
  const compact = useSharedValue(0);
  const pinned = useSharedValue(0);
  const flags = useRef({ compact: false, pinned: false });
  const [compactOn, setCompactOn] = useState(false);
  const [pinnedOn, setPinnedOn] = useState(false);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      chrome.onScroll(e);
      const y = e.nativeEvent.contentOffset.y;
      const c = y > compactAt;
      const p = chipsY > 0 && y >= chipsY - COMPACT_H;
      if (c !== flags.current.compact) {
        flags.current.compact = c;
        compact.value = timing(c ? 1 : 0, c ? duration.short : duration.exit);
        setCompactOn(c);
      }
      if (p !== flags.current.pinned) {
        flags.current.pinned = p;
        pinned.value = timing(p ? 1 : 0, duration.short);
        setPinnedOn(p);
      }
    },
    [chrome, compactAt, chipsY, compact, pinned],
  );
  const compactStyle = useAnimatedStyle(() => ({
    opacity: compact.value,
    transform: [{ translateY: (compact.value - 1) * 8 }],
  }));
  const pinnedStyle = useAnimatedStyle(() => ({ opacity: pinned.value }));

  const quickRow = (
    <QuickFilterRow
      value={quick}
      onChange={setQuick}
      near={effectiveScope === 'near'}
      onToggleNear={toggleNear}
      locating={locating}
    />
  );

  const heroW = Math.min(280, width - 64);
  const draftStep = Math.min((draft?.step ?? 0) + 1, SELL_STEP_COUNT);

  const listHeader = (
    <Animated.View layout={layoutEase()}>
      {/* Location chip + bell */}
      <View style={s.topRow}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Zone : ${scopeCaption}, ${locationLabel}. Changer la zone, le quartier ou la ville`}
          onPress={() => setShowScope(true)}
          hitSlop={{ top: 6, bottom: 6 }}
          style={s.locationChip}>
          <Ionicons name="location" size={16} color={t.colors.brand} />
          <AppText variant="labelStrong" numberOfLines={1} style={s.flexShrink}>
            {locationLabel}
          </AppText>
          <Ionicons name="chevron-down" size={16} color={t.colors.inkMuted} />
        </PressableScale>
        <View style={s.flex} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} non lues` : 'Notifications'}
          onPress={() => router.push('/notifications')}
          style={s.bell}>
          <Ionicons name="notifications-outline" size={20} color={t.colors.ink} />
          {unreadCount > 0 && <View style={s.bellDot} />}
        </PressableScale>
      </View>

      <AppText
        style={s.headline}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header">
        {'La bonne affaire,\n'}
        <AppText style={[s.headline, { color: t.colors.brand }]}>près de chez vous</AppText>
      </AppText>

      {/* Search bar → Rechercher tab; the IA button opens Trouve-moi ça. */}
      <View onLayout={(e: LayoutChangeEvent) => setCompactAt(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        <PressableScale
          accessibilityRole="search"
          accessibilityLabel="Rechercher une annonce"
          onPress={() => openSearch(false)}
          style={[s.searchBar, t.elevation.card as object]}>
          <Ionicons name="search" size={20} color={t.colors.inkSubtle} />
          <AppText variant="body" color="inkSubtle" style={s.flex} numberOfLines={1}>
            Rechercher
          </AppText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Trouve-moi ça : décrire votre besoin à l’IA"
            onPress={() => openSearch(true)}
            style={s.aiButton}>
            <Ionicons name="sparkles" size={14} color={t.colors.canvas} />
            <AppText variant="captionStrong" style={{ color: t.colors.canvas }}>
              IA
            </AppText>
          </PressableScale>
        </PressableScale>
      </View>

      {showHero && (
        <View>
          <SectionHeader title="Nouveau près de vous" action="Tout voir" onAction={seeAllNew} />
          <FlatList
            horizontal
            data={hero}
            keyExtractor={(p) => `hero-${p.id}`}
            showsHorizontalScrollIndicator={false}
            snapToInterval={heroW + HERO_GAP}
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={s.heroRow}
            ItemSeparatorComponent={HeroGap}
            renderItem={({ item }) => (
              <ListingCard
                post={item}
                variant="hero"
                width={heroW}
                height={HERO_H}
                onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
              />
            )}
          />
        </View>
      )}

      <SectionHeader title="Catégories" />
      <CategoryMosaic
        categories={MOSAIC_CATEGORIES}
        onSelect={browseCategory}
        onSeeAll={() => setShowCategories(true)}
      />

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
            <View>
              <PressableScale
                onPress={() => router.push('/post-item')}
                accessibilityRole="button"
                accessibilityLabel={`Terminer votre annonce, étape ${draftStep} sur ${SELL_STEP_COUNT}`}
                accessibilityHint="Glissez ou touchez « Masquer » pour la cacher"
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
                    Étape {draftStep} sur {SELL_STEP_COUNT}
                    {draft.updatedAt ? ` · ${formatRelativeTime(draft.updatedAt).toLowerCase()}` : ''}
                  </AppText>
                  <ProgressBar
                    progress={draftStep / SELL_STEP_COUNT}
                    style={s.progress}
                    trackColor={t.colors.surface}
                    accessibilityLabel="Progression de l’annonce"
                  />
                </View>
              </PressableScale>
              {/* Visible dismiss, not only the swipe (the draft itself is kept). */}
              <IconButton
                icon="close"
                label="Masquer la carte du brouillon"
                size={20}
                color="inkMuted"
                onPress={() => setHiddenDraftAt(draft.updatedAt ?? '')}
                style={s.draftClose}
              />
            </View>
          </SwipeRow>
        </Animated.View>
      )}

      <View style={s.quickWrap} onLayout={(e: LayoutChangeEvent) => setChipsY(e.nativeEvent.layout.y)}>
        {quickRow}
      </View>
      <SectionHeader title={feedTitle} />
    </Animated.View>
  );

  const empty = feed.isError ? (
    <ErrorState message="Impossible de charger les annonces." onRetry={() => feed.refetch()} />
  ) : (
    <EmptyState
      icon="pricetags-outline"
      title={
        quick === 'free'
          ? 'Aucune annonce gratuite'
          : quick === 'cheap'
            ? 'Rien à moins de 50 000 F'
            : effectiveScope === 'near'
              ? 'Rien près de vous'
              : effectiveScope === 'quartier'
                ? 'Aucune annonce dans votre quartier'
                : 'Aucune annonce dans votre ville'
      }
      message={
        quick !== 'recent'
          ? 'Essayez un autre filtre, ou revenez plus tard.'
          : effectiveScope === 'near'
            ? `Aucune annonce localisée à moins de ${NEAR_RADIUS_KM} km.`
            : 'Soyez le premier à vendre près de chez vous.'
      }
      actionLabel={quick !== 'recent' ? 'Voir les annonces récentes' : 'Publier une annonce'}
      onAction={quick !== 'recent' ? () => setQuick('recent') : () => router.push('/post-item')}
      secondaryLabel={quick === 'recent' && effectiveScope !== 'city' ? 'Voir toute la ville' : undefined}
      onSecondary={quick === 'recent' && effectiveScope !== 'city' ? () => setScope('city') : undefined}
    />
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.clip}>
        <ListingGrid
          masonry
          posts={posts}
          loading={feed.isLoading}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => {
            feed.refetch();
            if (quick !== 'recent') scopeFeed.refetch();
          }}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          fetchingMore={feed.isFetchingNextPage}
          onToggleLike={onToggleLike}
          onScroll={onScroll}
          scrollEventThrottle={chrome.scrollEventThrottle}
          contentPaddingTop={0}
          contentPaddingBottom={tabInset}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={empty}
        />

        {/* Compact bar + pinned quick filters, shown once scrolled. */}
        <Animated.View pointerEvents={compactOn ? 'box-none' : 'none'} style={[s.overlay, compactStyle]}>
          <View style={s.compactBar}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Zone : ${scopeCaption}, ${locationLabel}. Changer la zone`}
              onPress={() => setShowScope(true)}
              style={s.compactTitle}>
              <AppText style={s.compactText} numberOfLines={1} accessibilityRole="header">
                {place ?? 'BonDeal'}
              </AppText>
              <Ionicons name="chevron-down" size={16} color={t.colors.inkMuted} />
            </PressableScale>
            <PressableScale
              accessibilityRole="search"
              accessibilityLabel="Rechercher une annonce"
              onPress={() => openSearch(false)}
              style={s.compactSearch}>
              <Ionicons name="search" size={18} color={t.colors.ink} />
            </PressableScale>
          </View>
          <Animated.View
            pointerEvents={pinnedOn ? 'auto' : 'none'}
            style={[s.pinnedChips, pinnedStyle]}
            importantForAccessibility={pinnedOn ? 'auto' : 'no-hide-descendants'}>
            {quickRow}
          </Animated.View>
        </Animated.View>
      </View>

      <CategorySheet
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        selected={null}
        onSelect={(v) => {
          setShowCategories(false);
          browseCategory(v);
        }}
      />
      <HomeScopeSheet
        visible={showScope}
        onClose={() => setShowScope(false)}
        scope={effectiveScope}
        onScopeChange={onScopeChange}
        city={user?.city}
        quartier={user?.quartier}
        nearRadiusKm={NEAR_RADIUS_KM}
        locating={locating}
        onChangeLocation={openQuartierPicker}
      />
      <QuartierPickerSheet visible={showQuartier} onClose={() => setShowQuartier(false)} />
    </View>
  );
}

function HeroGap() {
  return <View style={{ width: HERO_GAP }} />;
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.section}>
      <AppText style={s.sectionTitle} numberOfLines={1} accessibilityRole="header">
        {title}
      </AppText>
      {action && onAction ? (
        <PressableScale accessibilityRole="link" onPress={onAction} style={s.sectionAction} hitSlop={8}>
          <AppText variant="labelStrong" color="brandStrong">
            {action}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  clip: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.xs,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    height: 36,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  bell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.danger,
  },
  headline: {
    ...font('700'),
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.6,
    color: t.colors.ink,
    paddingHorizontal: t.spacing.md,
    marginTop: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    height: 52,
    marginHorizontal: t.spacing.md,
    marginTop: 14,
    paddingLeft: t.spacing.md,
    paddingRight: 6,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.ink,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: t.spacing.md,
    gap: t.spacing.sm,
  },
  sectionTitle: { ...font('700'), fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: t.colors.ink, flex: 1 },
  sectionAction: { minHeight: 32, justifyContent: 'center' },
  heroRow: { paddingHorizontal: t.spacing.md },
  quickWrap: { marginTop: t.spacing.md },
  draftWrap: { marginHorizontal: t.spacing.md, marginTop: t.spacing.lg },
  draftSwipe: { borderRadius: t.radius.md },
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    paddingRight: 56, // room for the dismiss button
    backgroundColor: t.colors.brandTint,
  },
  draftClose: { position: 'absolute', top: 0, right: 0 },
  draftThumb: { width: 48, height: 48, borderRadius: t.radius.sm },
  draftThumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.surface },
  progress: { marginTop: 8 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  compactBar: {
    height: COMPACT_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    backgroundColor: t.colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
  compactTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  compactText: { ...font('700'), fontSize: 16, lineHeight: 21, color: t.colors.ink, flexShrink: 1 },
  compactSearch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.md,
  },
  pinnedChips: {
    backgroundColor: t.colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.line,
  },
}));

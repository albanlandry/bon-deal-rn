// app/item-details.tsx — Item details (doc 06 §4.1, docs/09 §4): immersive
// parallax gallery with the price pill on the photo, trust card high up,
// smooth-height sections, snapping "Annonces similaires" carousel, a sticky
// action bar that slides up after 120 px, and the offer Sheet in place.
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, LayoutChangeEvent, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Badge,
  Button,
  CategoryTag,
  ErrorState,
  HeartBurst,
  IconButton,
  ListingCard,
  Price,
  SafetyBanner,
  SellerCard,
  Skeleton,
  showToast,
} from '@/components/ui';
import ItemGallery from '@/components/organisms/ItemGallery';
import ItemPriceCheckCard from '@/components/molecules/ItemPriceCheckCard';
import ReportSheet from '@/components/organisms/ReportSheet';
import OfferSheet from '@/components/organisms/OfferSheet';
import { enterFade, layoutSpring, timing } from '@/components/motion/anim';
import { useToggleLike } from '@/lib/api/likeToggle';
import { duration } from '@/theme/motion';
import { blockedMessage } from '@/lib/api/safety';
import { useAuth } from '@/contexts/AuthContext';
import {
  likePost,
  postByIdQuery,
  postsInfiniteQuery,
  priceCheck,
  sharePost,
  unlikePost,
} from '@/lib/api/posts';
import { getOrCreateConversation } from '@/lib/api/conversations';
import { ApiError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';
import { isReady, largeUrl } from '@/lib/images';
import { AGE_LABELS, categoryLabel, conditionLabel } from '@/constants/catalog';

/** The action bar appears after this much scroll (photo unobstructed first). */
const BAR_REVEAL_Y = 120;
const SIMILAR_W = 168;
const DESC_CLAMP = 260;
import type { BdPost, BdPriceCheck } from '@/constants/types';
import { createStyles, useStyles, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

function priceCheckErrorMessage(e: unknown): string {
  const status = e instanceof ApiError ? e.status : 0;
  if (status === 503) return "L'assistant prix n'est pas disponible pour le moment.";
  if (status === 429) return 'Trop de vérifications — réessayez plus tard.';
  if (status === 409) return "Cette annonce n'a pas de prix à vérifier.";
  return 'Impossible de vérifier le prix. Réessayez.';
}

function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

function DetailsSkeleton() {
  const t = useTheme();
  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: t.colors.canvas }}>
      <Skeleton height={340} radius={0} />
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton width="40%" height={28} />
        <Skeleton width="85%" height={20} />
        <Skeleton width="60%" height={14} />
        <Skeleton height={80} style={{ marginTop: 12 }} />
        <Skeleton height={120} />
      </View>
    </SafeAreaView>
  );
}

export default function ItemDetailsScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const postId = Number(id);
  const queryClient = useQueryClient();

  const [bonPrix, setBonPrix] = useState<BdPriceCheck | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const { height: winH } = useWindowDimensions();

  // Scroll-driven chrome: parallax (gallery), compact top bar, action bar.
  const scrollY = useSharedValue(0);
  const barShown = useSharedValue(0);
  const shortPage = useSharedValue(0);
  const barTarget = useSharedValue(0);
  const [barH, setBarH] = useState(88);
  const [galleryH, setGalleryH] = useState(320);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
    const want = shortPage.value === 1 || e.contentOffset.y > BAR_REVEAL_Y ? 1 : 0;
    if (want !== barTarget.value) {
      // Target flips once per crossing; the timing runs on the UI thread.
      barTarget.value = want;
      barShown.value = timing(want, want ? duration.medium : duration.exit, want ? 'enter' : 'exit');
    }
  });
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - barShown.value) * (barH + 24) }],
  }));
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [galleryH - 140, galleryH - 60], [0, 1], 'clamp'),
  }));

  // Entrance: the page scales in from 0.96 and fades — with the stack's fade
  // it reads as the card expanding into the item page.
  const enter = useSharedValue(0);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.96 + 0.04 * enter.value }],
  }));
  const { data: post, isLoading, error, refetch } = useQuery(postByIdQuery(postId));

  // Analytics (opt-in): one view_item per opened listing.
  const viewedId = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!post || viewedId.current === post.id) return;
    viewedId.current = post.id;
    track('view_item', { post_id: post.id, category: post.categories?.[0] ?? null });
  }, [post]);

  // Similar items: same first category, current post excluded.
  const firstCat = post?.categories?.[0];
  const similarQuery = useInfiniteQuery({
    ...postsInfiniteQuery({ categories: firstCat ? [firstCat] : undefined }),
    enabled: !!firstCat,
  });
  const similar = useMemo(
    () =>
      (similarQuery.data?.pages.flatMap((p) => p.posts) ?? [])
        .filter((p) => p.id !== postId && p.state === 'published')
        .slice(0, 10),
    [similarQuery.data, postId],
  );

  const toggleSimilarLike = useToggleLike((e: any) =>
    showToast.error('Échec', e?.message || 'Impossible de modifier vos favoris.'),
  );

  const bonPrixMutation = useMutation({
    mutationFn: () => priceCheck(postId),
    onSuccess: setBonPrix,
    onError: (e: any) => showToast.error('Bon prix ?', priceCheckErrorMessage(e)),
  });

  // Like/unlike with optimistic cache update (Doherty); post.liked_by_me is the source of truth.
  const likeMutation = useMutation({
    mutationFn: (currentlyLiked: boolean) => (currentlyLiked ? unlikePost(postId) : likePost(postId)),
    onMutate: async (currentlyLiked: boolean) => {
      // Haptic comes from HeartBurst.
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const prev = queryClient.getQueryData<BdPost>(['post', postId]);
      queryClient.setQueryData<BdPost>(['post', postId], (old) =>
        old
          ? {
              ...old,
              liked_by_me: !currentlyLiked,
              likes_count: Math.max(0, old.likes_count + (currentlyLiked ? -1 : 1)),
            }
          : old,
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      // 400 = already in the desired state; keep the optimistic value.
      if (e instanceof ApiError && e.status === 400) return;
      if (ctx?.prev) queryClient.setQueryData(['post', postId], ctx.prev);
      showToast.error('Échec', 'Action impossible. Réessayez.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'liked'] });
    },
  });

  const contactMutation = useMutation({
    mutationFn: () => getOrCreateConversation(postId),
    onSuccess: (conv) => {
      router.push({ pathname: '/chatroom', params: { conversationId: String(conv.id) } });
    },
    onError: (e: any) => {
      // 403 between blocked users carries a French server message.
      const blocked = blockedMessage(e);
      showToast.error(blocked ? 'Contact impossible' : 'Échec', blocked ?? (e?.message || "Impossible d'ouvrir la conversation."));
    },
  });

  const loaded = !!post;
  useEffect(() => {
    // Same route re-used with a new id (deep link / similar item): the scroll
    // view remounts at 0 without a scroll event, so reset the chrome too.
    scrollY.value = 0;
    setDescOpen(false);
    if (loaded) {
      enter.value = 0;
      enter.value = timing(1, duration.medium, 'enter');
    }
  }, [loaded, postId]);

  const handleShare = async () => {
    if (!post) return;
    try {
      const priceText = post.is_free ? 'Gratuit' : post.price != null ? `${post.price} FCFA` : '';
      const res = await Share.share({
        message: `${post.title}${priceText ? ` — ${priceText}` : ''} sur BonDeal`,
      });
      if (res.action === Share.sharedAction) {
        sharePost(post.id).catch(() => {});
        track('share_item', { post_id: post.id, category: post.categories?.[0] ?? null });
      }
    } catch {
      // user cancelled / share unavailable
    }
  };

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <ErrorState message="Cette annonce est introuvable." />
        <Button label="Retour" variant="secondary" onPress={() => router.back()} style={styles.backBtn} />
      </SafeAreaView>
    );
  }

  if (isLoading) return <DetailsSkeleton />;

  if (error || !post) {
    return (
      <SafeAreaView style={styles.screen}>
        <ErrorState message="Impossible de charger cette annonce." onRetry={() => refetch()} />
        <Button label="Retour" variant="ghost" onPress={() => router.back()} style={styles.backBtn} />
      </SafeAreaView>
    );
  }

  const imageUrls = post.images.filter(isReady).map((img) => largeUrl(img)!).filter(Boolean);
  const isOwner = !!user && user.id === post.owner_id;
  const available = post.state === 'published';
  const canOffer = !isOwner && available && post.allow_negotiation && !post.is_free;
  const condition = conditionLabel(post.condition);
  const age = post.age_bucket ? AGE_LABELS[post.age_bucket] : null;
  const locationText = [post.pickup_quartier, post.city].filter(Boolean).join(', ');
  const stateBadge =
    post.state === 'sold'
      ? { label: 'Vendu', tone: 'neutral' as const }
      : post.state === 'reserved'
        ? { label: 'Réservé', tone: 'warning' as const }
        : post.state === 'draft'
          ? { label: 'Brouillon', tone: 'neutral' as const }
          : post.state === 'unpublished'
            ? { label: 'Masquée', tone: 'neutral' as const }
            : null;

  const facts = [
    { icon: 'pricetags-outline' as const, label: 'Catégorie', value: categoryLabel(post.categories[0]) },
    condition ? { icon: 'sparkles-outline' as const, label: 'État', value: condition } : null,
    age ? { icon: 'time-outline' as const, label: 'Âge', value: age } : null,
  ].filter(Boolean) as { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  const headerButtons = (
    <View style={[styles.galleryHeader, { top: insets.top + 4 }]} pointerEvents="box-none">
      <IconButton icon="arrow-back" label="Retour" variant="overlay" onPress={goBack} />
      <View style={styles.row}>
        <IconButton icon="share-social-outline" label="Partager l'annonce" variant="overlay" onPress={handleShare} />
        {!isOwner && (
          <IconButton icon="flag-outline" label="Signaler l'annonce" variant="overlay" onPress={() => setReportOpen(true)} />
        )}
      </View>
    </View>
  );

  // Price pill pinned to the photo, state + condition beside it.
  const pricePill = (
    <View style={styles.pillRow}>
      <View style={[styles.pricePill, t.elevation.card as object]}>
        <Price amount={post.price} isFree={post.is_free} isExchange={!!post.exchange_items} size="md" />
      </View>
      {stateBadge && <Badge label={stateBadge.label} tone={stateBadge.tone === 'neutral' ? 'overlay' : stateBadge.tone} style={styles.pillBadge} />}
      {condition && <Badge label={condition} tone="overlay" icon="sparkles-outline" style={styles.pillBadge} />}
    </View>
  );

  const longDesc = (post.description?.length ?? 0) > DESC_CLAMP;

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.flex, enterStyle]}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={(_, h) => {
            shortPage.value = h <= winH + BAR_REVEAL_Y ? 1 : 0;
            if (shortPage.value === 1 && barTarget.value !== 1) {
              barTarget.value = 1;
              barShown.value = timing(1, duration.medium, 'enter');
            }
          }}
          contentContainerStyle={{ paddingBottom: barH + 16 }}
          showsVerticalScrollIndicator={false}>
          <View onLayout={(e: LayoutChangeEvent) => setGalleryH(e.nativeEvent.layout.height)}>
            <ItemGallery
              images={imageUrls}
              title={post.title}
              scrollY={scrollY}
              bottomOverlay={pricePill}
            />
          </View>

          <View style={styles.body}>
            <AppText variant="h2" accessibilityRole="header">
              {post.title}
            </AppText>
            {post.is_free && (
              <AppText variant="small" color="inkMuted">
                Donnez une seconde vie à cet objet.
              </AppText>
            )}
            <View style={styles.badges}>
              {!!post.categories?.[0] && <CategoryTag value={post.categories[0]} />}
              {post.is_free && <Badge label="Gratuit" tone="success" icon="gift-outline" />}
              {!!post.exchange_items && <Badge label="Échange possible" tone="trust" icon="swap-horizontal" />}
              {post.allow_negotiation && !post.is_free && <Badge label="Négociable" tone="brand" icon="chatbubbles-outline" />}
            </View>
            <AppText variant="caption" color="inkMuted">
              Publié {formatRelativeTime(post.created_at).toLowerCase()}
              {` · ${plural(post.views_count, 'vue')} · ${plural(post.likes_count, 'favori')}`}
            </AppText>

            {/* Trust card, high up (social proof before the details) */}
            <View style={styles.section}>
              <SellerCard
                userId={post.owner_id}
                username={post.owner_username}
                city={post.city}
                isMe={isOwner}
                onPress={() =>
                  router.push({
                    pathname: '/seller-profile',
                    params: { userId: String(post.owner_id), username: post.owner_username ?? '' },
                  } as unknown as Href)
                }
              />
            </View>

            {facts.length > 0 && (
              <View style={styles.facts}>
                {facts.map((f) => (
                  <View key={f.label} style={styles.fact}>
                    {f.label === 'Catégorie' && post.categories?.[0] ? (
                      <CategoryTag value={post.categories[0]} iconOnly size={32} />
                    ) : (
                      <View style={styles.factIcon}>
                        <Ionicons name={f.icon} size={18} color={t.colors.inkMuted} />
                      </View>
                    )}
                    <View>
                      <AppText variant="caption" color="inkMuted">
                        {f.label}
                      </AppText>
                      <AppText variant="labelStrong">{f.value}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Bon prix ? (buyer-facing price check) */}
            <Animated.View layout={layoutSpring()}>
              {!post.is_free && !!post.price && !bonPrix && (
                <Button
                  label={bonPrixMutation.isPending ? 'Analyse du marché…' : "C'est un bon prix ?"}
                  icon="analytics-outline"
                  variant="secondary"
                  size="sm"
                  loading={bonPrixMutation.isPending}
                  onPress={() => bonPrixMutation.mutate()}
                  style={[styles.alignStart, styles.section]}
                />
              )}
              {bonPrix && (
                <Animated.View entering={enterFade()} style={styles.section}>
                  <ItemPriceCheckCard check={bonPrix} onDismiss={() => setBonPrix(null)} />
                </Animated.View>
              )}
            </Animated.View>

            {!!post.exchange_items && (
              <Animated.View layout={layoutSpring()} style={styles.section}>
                <AppText variant="h3">Échange contre</AppText>
                <AppText variant="body" color="inkMuted">
                  {post.exchange_items}
                </AppText>
              </Animated.View>
            )}

            {!!post.description && (
              <Animated.View layout={layoutSpring()} style={styles.section}>
                <AppText variant="h3">Description</AppText>
                <AppText variant="body" numberOfLines={longDesc && !descOpen ? 5 : undefined}>
                  {post.description}
                </AppText>
                {longDesc && (
                  <Button
                    label={descOpen ? 'Voir moins' : 'Voir plus'}
                    iconRight={descOpen ? 'chevron-up' : 'chevron-down'}
                    variant="ghost"
                    size="sm"
                    onPress={() => setDescOpen((v) => !v)}
                    style={styles.alignStart}
                  />
                )}
              </Animated.View>
            )}

            {(locationText || post.pickup_location_note) && (
              <Animated.View layout={layoutSpring()} style={styles.section}>
                <AppText variant="h3">Lieu de remise</AppText>
                <View style={styles.location}>
                  <Ionicons name="location" size={20} color={t.colors.brandStrong} />
                  <View style={styles.flex}>
                    {!!locationText && <AppText variant="bodyStrong">{locationText}</AppText>}
                    {!!post.pickup_location_note && (
                      <AppText variant="small" color="inkMuted">
                        {post.pickup_location_note}
                      </AppText>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            {!isOwner && (
              <Animated.View layout={layoutSpring()} style={styles.section}>
                <SafetyBanner />
                <Button
                  label="Signaler cette annonce"
                  icon="flag-outline"
                  variant="ghost"
                  size="sm"
                  onPress={() => setReportOpen(true)}
                  style={styles.alignStart}
                />
              </Animated.View>
            )}
          </View>

          {similar.length > 0 && (
            <Animated.View layout={layoutSpring()} style={styles.similar}>
              <AppText variant="h3" style={styles.similarTitle}>
                Annonces similaires
              </AppText>
              <FlatList
                data={similar}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SIMILAR_W + t.spacing.sm}
                snapToAlignment="start"
                decelerationRate="fast"
                keyExtractor={(p) => String(p.id)}
                contentContainerStyle={styles.similarList}
                renderItem={({ item }) => (
                  <ListingCard
                    post={item}
                    width={SIMILAR_W}
                    onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
                    onToggleLike={() => toggleSimilarLike.mutate({ id: item.id, like: !item.liked_by_me })}
                  />
                )}
              />
            </Animated.View>
          )}
        </Animated.ScrollView>

        {/* Compact top bar fades in once the photo has scrolled away */}
        <Animated.View
          pointerEvents="none"
          style={[styles.topBar, { height: insets.top + 56, paddingTop: insets.top }, topBarStyle]}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.topBarTitle}>
            {post.title}
          </AppText>
        </Animated.View>
        {headerButtons}

        {/* Sticky action bar — thumb zone (Fitts); slides up after 120 px */}
        <Animated.View
          onLayout={(e: LayoutChangeEvent) => setBarH(Math.round(e.nativeEvent.layout.height))}
          style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) }, barStyle]}>
          {isOwner ? (
            <>
              <Button
                label="Mes annonces"
                variant="secondary"
                onPress={() => router.push('/my-listings')}
                style={styles.flex}
              />
              <Button
                label="Modifier"
                icon="create-outline"
                onPress={() => router.push({ pathname: '/post-item', params: { id: String(post.id), mode: 'edit' } })}
                style={styles.flex}
              />
            </>
          ) : (
            <>
              <HeartBurst
                liked={post.liked_by_me}
                onToggle={() => {
                  if (!likeMutation.isPending) likeMutation.mutate(post.liked_by_me);
                }}
                box={48}
                size={22}
                style={styles.heart}
              />
              <Button
                label="Contacter"
                icon="chatbubble-outline"
                variant={canOffer ? 'secondary' : 'primary'}
                loading={contactMutation.isPending}
                onPress={() => contactMutation.mutate()}
                style={styles.flex}
              />
              {canOffer && (
                <Button label="Faire une offre" haptic onPress={() => setOfferOpen(true)} style={styles.flex} />
              )}
            </>
          )}
        </Animated.View>
      </Animated.View>

      {canOffer && (
        <OfferSheet
          visible={offerOpen}
          onClose={() => setOfferOpen(false)}
          postId={post.id}
          onSent={(_neg, convId) => {
            if (convId) router.push({ pathname: '/chatroom', params: { conversationId: String(convId) } });
          }}
        />
      )}
      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post.id}
        subject={post.title}
      />
    </View>
  );
}

const makeStyles = createStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.canvas },
  backBtn: { margin: t.spacing.md },
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
  alignStart: { alignSelf: 'flex-start' },
  galleryHeader: {
    position: 'absolute',
    left: t.spacing.xs,
    right: t.spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  body: { padding: t.spacing.md, gap: t.spacing.xs },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  pricePill: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surface,
  },
  pillBadge: { paddingVertical: 5 },
  heart: { borderWidth: 1, borderColor: t.colors.line, backgroundColor: t.colors.surface },
  factIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.surfaceAlt },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
  },
  topBarTitle: { marginHorizontal: 64 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.md,
    marginTop: t.spacing.sm,
    padding: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderColor: t.colors.line,
    borderWidth: 1,
    borderRadius: t.radius.md,
  },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: '40%' },
  section: { marginTop: t.spacing.lg, gap: t.spacing.xs },
  location: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    padding: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderColor: t.colors.line,
    borderWidth: 1,
    borderRadius: t.radius.md,
  },
  similar: { marginTop: t.spacing.sm },
  similarTitle: { paddingHorizontal: t.spacing.md, marginBottom: t.spacing.xs },
  similarList: { paddingHorizontal: t.spacing.md, gap: t.spacing.sm },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.line,
    ...(t.elevation.sheet as object),
  },
}));

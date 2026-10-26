// app/item-details.tsx — "Annonce" (docs/12 layout, docs/09 motion): the photo
// gallery full bleed (~55 % of the screen, parallax 0.5× + stretch on
// pull-down), a content sheet that overlaps it by 28 dp and scrolls over it
// (price, title, fact tiles, seller on one line, description, place,
// similar listings), and a floating dark action dock visible from the start
// with the payment safety line on top. The offer Sheet opens in place.
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Href, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutChangeEvent, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
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
  ListingCard,
  Price,
  PressableScale,
  SafetyBanner,
  SellerCard,
  Skeleton,
  showToast,
} from '@/components/ui';
import ItemGallery, { galleryHeightFor } from '@/components/organisms/ItemGallery';
import ItemPriceCheckCard from '@/components/molecules/ItemPriceCheckCard';
import ReportSheet from '@/components/organisms/ReportSheet';
import OfferSheet from '@/components/organisms/OfferSheet';
import ActionDock, { dockBottom, DockButton, useDockColors } from '@/components/organisms/ActionDock';
import { enterFade, layoutSpring, openIn, riseIn } from '@/components/motion/anim';
import AppImage from '@/components/atoms/AppImage';
import { useSharedPhotoTarget } from '@/components/motion/SharedPhoto';
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
import { formatAmount, formatRelativeTime } from '@/lib/format';
import { coverThumb, isReady, itemDetailsRoute, largeUrl, safeCoverParam } from '@/lib/images';
import { AGE_LABELS, conditionLabel } from '@/constants/catalog';

const SIMILAR_W = 168;
const DESC_CLAMP = 260;
/** How far the content sheet overlaps the photo. */
const SHEET_OVERLAP = 28;
import PostStats from '@/components/molecules/PostStats';
import type { BdPost, BdPriceCheck } from '@/constants/types';
import { createStyles, useStyles, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

function priceCheckErrorMessage(e: unknown): string {
  const status = e instanceof ApiError ? e.status : 0;
  if (status === 503) return 'L’assistant prix n’est pas disponible pour le moment.';
  if (status === 429) return 'Trop de vérifications — réessayez plus tard.';
  if (status === 409) return 'Cette annonce n’a pas de prix à vérifier.';
  return 'Impossible de vérifier le prix. Réessayez.';
}

/** Gallery ratio on this page (height = 2 × width, capped at 55 % of the screen). */
const GALLERY_RATIO = 2;

/**
 * Loading state. With the tapped card's cover (`cover` param, already in the
 * image cache) the photo shows at once and "opens" (fade + scale from 0.96);
 * the sheet skeleton rises under it.
 */
function DetailsSkeleton({ cover, shared, onCoverLoad }: { cover?: string; shared?: boolean; onCoverLoad?: () => void }) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const photoH = galleryHeightFor(width, height, GALLERY_RATIO);
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.surface }} accessibilityLabel="Chargement de l’annonce">
      {cover ? (
        <Animated.View entering={shared ? undefined : openIn()}>
          <AppImage uri={cover} style={{ width, height: photoH }} onLoad={onCoverLoad} />
        </Animated.View>
      ) : (
        <Skeleton height={photoH} radius={0} />
      )}
      <Animated.View
        entering={riseIn()}
        style={{
          marginTop: -SHEET_OVERLAP,
          padding: 16,
          gap: 12,
          backgroundColor: t.colors.surface,
          borderTopLeftRadius: t.radius.lg,
          borderTopRightRadius: t.radius.lg,
        }}>
        <Skeleton width="45%" height={28} />
        <Skeleton width="85%" height={20} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Skeleton height={48} radius={t.radius.sm} style={{ flex: 1 }} />
          <Skeleton height={48} radius={t.radius.sm} style={{ flex: 1 }} />
          <Skeleton height={48} radius={t.radius.sm} style={{ flex: 1 }} />
        </View>
        <Skeleton height={56} radius={t.radius.sm} />
      </Animated.View>
    </View>
  );
}

export default function ItemDetailsScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  // `cover`: the tapped card's photo URI (optional, display only) so the
  // photo shows from the image cache while the listing loads.
  const { id, cover: coverParam } = useLocalSearchParams<{ id?: string; cover?: string }>();
  const cover = safeCoverParam(coverParam);
  const { user } = useAuth();
  const postId = Number(id);
  const queryClient = useQueryClient();

  const [bonPrix, setBonPrix] = useState<BdPriceCheck | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  // Scroll-driven chrome: parallax (gallery) and compact top bar. The action
  // bar is always shown (docs/11 §4.6 reverses docs/09's reveal after 120 px).
  const scrollY = useSharedValue(0);
  const dock = useDockColors();
  const [dockH, setDockH] = useState(112);
  const [galleryH, setGalleryH] = useState(420);
  // Light status bar over the photo, back to the scheme's once the bar shows.
  const [lightStatus, setLightStatus] = useState(true);
  // "Voir des annonces similaires" (unavailable listing) scrolls to the carousel.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const similarY = useRef(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  useAnimatedReaction(
    () => scrollY.value < galleryH - 100,
    (over, prev) => {
      if (over !== prev) runOnJS(setLightStatus)(over);
    },
    [galleryH],
  );
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [galleryH - 140, galleryH - 60], [0, 1], 'clamp'),
  }));

  const { data: post, isLoading, error, refetch } = useQuery(postByIdQuery(postId));

  // Entrance (with the stack's fade it reads as the card opening): the photo
  // fades in scaling up from 0.96, the content sheet rises from below on
  // spring.default, then the dock rises `duration.step` later. When the
  // loading state already played it (photo + rising sheet), the loaded page
  // only cross-fades in so nothing moves twice.
  const sawLoading = useRef(false);
  if (isLoading) sawLoading.current = true;
  const coverShown = sawLoading.current && !!cover;

  // Card photo → hero flight (motion/SharedPhoto): when this page was opened
  // from a card, the photo flies in from the card instead of fading/scaling,
  // and flies back on the way out if the card is still on screen.
  const navigation = useNavigation();
  const win = useWindowDimensions();
  const shared = useSharedPhotoTarget(postId, {
    x: 0,
    y: 0,
    w: win.width,
    h: galleryHeightFor(win.width, win.height, GALLERY_RATIO),
  });
  useEffect(
    () => navigation.addListener('beforeRemove', () => shared.back(scrollY.value)),
    [navigation, shared.back, scrollY],
  );

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
      showToast.error(blocked ? 'Contact impossible' : 'Échec', blocked ?? (e?.message || 'Impossible d’ouvrir la conversation.'));
    },
  });

  useEffect(() => {
    // Same route re-used with a new id (deep link / similar item): the scroll
    // view remounts at 0 without a scroll event, so reset the chrome too.
    scrollY.value = 0;
    setDescOpen(false);
  }, [postId]);

  const handleShare = async () => {
    if (!post) return;
    try {
      const priceText = post.is_free ? 'Gratuit' : post.price != null ? formatAmount(post.price) : '';
      const url = Linking.createURL('/item-details', { queryParams: { id: String(post.id) } });
      const res = await Share.share({
        message: `${post.title}${priceText ? ` — ${priceText}` : ''} sur BonDeal\n${url}`,
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

  if (isLoading) return <DetailsSkeleton cover={cover} shared={shared.active} onCoverLoad={shared.ready} />;

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

  // Not available to buyers: the action bar explains why instead of "Contacter".
  // A reserved listing tells who will hear when it frees up (docs/14 §8).
  const reservation = post.state === 'reserved' ? post.reservation : null;
  const reservedForMe = !!reservation?.for_me;
  const notifyMe = !!reservation && (reservation.notify_me || post.liked_by_me);
  const unavailableReason =
    post.state === 'sold'
      ? 'Cette annonce est vendue.'
      : reservedForMe
        ? 'Réservée pour vous.'
        : post.state === 'reserved'
          ? notifyMe
            ? 'Réservé — vous serez prévenu s’il se libère.'
            : 'Réservé — aimez l’annonce pour être prévenu s’il se libère.'
          : 'Cette annonce n’est plus disponible.';
  // The heart stays while reserved: liking it is how you ask to be told.
  const canLike = !isOwner && (available || (post.state === 'reserved' && !reservedForMe));

  // Three fact tiles (docs/12): État, Retrait, Publié — Âge fills a gap.
  const published = formatRelativeTime(post.created_at).replace("'", '’');
  const facts = [
    condition ? { label: 'État', value: condition } : null,
    post.pickup_quartier || post.city ? { label: 'Retrait', value: (post.pickup_quartier || post.city)! } : null,
    published ? { label: 'Publié', value: published.replace(/^./, (c) => c.toUpperCase()) } : null,
    age ? { label: 'Âge', value: age } : null,
  ]
    .filter(Boolean)
    .slice(0, 3) as { label: string; value: string }[];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));

  // Round translucent buttons over the photo (icons only, so round is fine).
  const glassBg = t.isDark ? t.colors.overlay : 'rgba(255,255,255,0.92)';
  const glassFg = t.isDark ? t.colors.onOverlay : '#0F1B2D';
  const headerButtons = (
    <View style={[styles.galleryHeader, { top: insets.top + 8 }]} pointerEvents="box-none">
      <GlassButton icon="arrow-back" label="Retour" onPress={goBack} bg={glassBg} fg={glassFg} />
      <View style={styles.headerRight}>
        <GlassButton icon="share-social-outline" label="Partager l’annonce" onPress={handleShare} bg={glassBg} fg={glassFg} />
        {canLike && (
          <HeartBurst
            liked={post.liked_by_me}
            onToggle={() => {
              if (!likeMutation.isPending) likeMutation.mutate(post.liked_by_me);
            }}
            box={40}
            size={20}
            background={glassBg}
            color={glassFg}
          />
        )}
      </View>
    </View>
  );

  // State on the photo (sold / reserved…); the condition is a fact tile.
  const photoBadges = stateBadge ? (
    <View style={styles.pillRow}>
      <Badge label={stateBadge.label} tone={stateBadge.tone === 'neutral' ? 'overlay' : stateBadge.tone} />
    </View>
  ) : undefined;

  const longDesc = (post.description?.length ?? 0) > DESC_CLAMP;
  const contentBottom = dockH + dockBottom(insets.bottom) + t.spacing.md;

  return (
    <View style={styles.screen}>
      <StatusBar style={lightStatus ? 'light' : t.isDark ? 'light' : 'dark'} />
      <View style={styles.flex}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: contentBottom }}
          showsVerticalScrollIndicator={false}>
          <Animated.View
            entering={
              coverShown || shared.active ? undefined : sawLoading.current ? enterFade(duration.medium) : openIn()
            }
            onLayout={(e: LayoutChangeEvent) => setGalleryH(e.nativeEvent.layout.height)}>
            <ItemGallery
              images={imageUrls}
              title={post.title}
              scrollY={scrollY}
              ratio={GALLERY_RATIO}
              bottomInset={SHEET_OVERLAP}
              bottomOverlay={photoBadges}
              placeholder={cover && cover === coverThumb(post.images) ? cover : undefined}
              onFirstImageLoad={shared.ready}
            />
          </Animated.View>

          {/* The content sheet slides over the photo */}
          <Animated.View
            entering={sawLoading.current ? enterFade(duration.medium) : riseIn({ delay: duration.step })}
            style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.priceRow}>
              <View style={styles.flex}>
                <Price amount={post.price} isFree={post.is_free} isExchange={!!post.exchange_items} size="lg" />
              </View>
              {post.allow_negotiation && !post.is_free && <Badge label="Négociable" tone="brand" />}
            </View>
            <AppText variant="h3" accessibilityRole="header" style={styles.title}>
              {post.title}
            </AppText>
            {post.is_free && (
              <AppText variant="small" color="inkMuted">
                Donnez une seconde vie à cet objet.
              </AppText>
            )}
            {(!!post.categories?.[0] || post.is_free || !!post.exchange_items) && (
              <View style={styles.badges}>
                {!!post.categories?.[0] && <CategoryTag value={post.categories[0]} />}
                {post.is_free && <Badge label="Gratuit" tone="success" icon="gift-outline" />}
                {!!post.exchange_items && <Badge label="Échange possible" tone="trust" icon="swap-horizontal" />}
              </View>
            )}

            {facts.length > 0 && (
              <View style={styles.facts}>
                {facts.map((f) => (
                  <View
                    key={f.label}
                    style={styles.fact}
                    accessible
                    accessibilityLabel={`${f.label} : ${f.value}`}>
                    <AppText variant="caption" color="inkSubtle" numberOfLines={1}>
                      {f.label}
                    </AppText>
                    <AppText variant="labelStrong" numberOfLines={1}>
                      {f.value}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
            <PostStats post={post} size="full" style={styles.counts} />

            {/* Seller on one line, before the details (social proof) */}
            <View style={styles.sellerBlock}>
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

            {/* Bon prix ? (buyer-facing price check) */}
            <Animated.View layout={layoutSpring()}>
              {!post.is_free && !!post.price && !bonPrix && (
                <Button
                  label={bonPrixMutation.isPending ? 'Analyse du marché…' : 'C’est un bon prix ?'}
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
                  <View style={styles.locationIcon}>
                    <Ionicons name="location" size={20} color={t.colors.brandStrong} />
                  </View>
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

            {similar.length > 0 && (
              <Animated.View
                layout={layoutSpring()}
                onLayout={(e: LayoutChangeEvent) => (similarY.current = galleryH - SHEET_OVERLAP + e.nativeEvent.layout.y)}
                style={styles.similar}>
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
                      onPress={() => router.push(itemDetailsRoute(item))}
                      onToggleLike={() => toggleSimilarLike.mutate({ id: item.id, like: !item.liked_by_me })}
                    />
                  )}
                />
              </Animated.View>
            )}
          </Animated.View>
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

        {/* Floating action dock — thumb zone (Fitts), visible from the start,
            with the payment safety line on top (never hidden). */}
        <ActionDock safety={!isOwner && available} onHeight={setDockH} enterDelay={duration.step * 2}>
          {isOwner ? (
            <>
              <DockButton label="Mes annonces" variant="glass" onPress={() => router.push('/my-listings')} />
              <DockButton
                label="Modifier"
                icon="create-outline"
                onPress={() => router.push({ pathname: '/post-item', params: { id: String(post.id), mode: 'edit' } })}
              />
            </>
          ) : !available ? (
            <>
              <View style={[styles.flex, styles.unavailable]} accessibilityRole="text">
                <Ionicons
                  name={reservedForMe ? 'calendar-outline' : notifyMe ? 'notifications-outline' : 'lock-closed-outline'}
                  size={18}
                  color={dock.fgMuted}
                />
                <AppText variant="labelStrong" style={[styles.flex, { color: dock.fg }]}>
                  {unavailableReason}
                </AppText>
              </View>
              {reservedForMe ? (
                <DockButton
                  label="Conversation"
                  icon="chatbubble-outline"
                  grow={false}
                  loading={contactMutation.isPending}
                  onPress={() => contactMutation.mutate()}
                />
              ) : similar.length > 0 && (
                <DockButton
                  label="Annonces similaires"
                  variant="glass"
                  grow={false}
                  accessibilityHint="Fait défiler jusqu’aux annonces similaires"
                  onPress={() => scrollRef.current?.scrollTo({ y: similarY.current, animated: true })}
                />
              )}
            </>
          ) : (
            <>
              {canOffer && (
                <DockButton label="Faire une offre" variant="glass" haptic onPress={() => setOfferOpen(true)} />
              )}
              <DockButton
                label="Contacter"
                icon="chatbubble-outline"
                loading={contactMutation.isPending}
                onPress={() => contactMutation.mutate()}
              />
            </>
          )}
        </ActionDock>
      </View>

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

/** 40 dp round translucent icon button over the photo (48 dp with hit slop). */
function GlassButton({
  icon,
  label,
  onPress,
  bg,
  fg,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      scaleTo={0.9}
      style={[glass.btn, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={20} color={fg} />
    </PressableScale>
  );
}

const glass = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});

const makeStyles = createStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.surface },
  backBtn: { margin: t.spacing.md },
  flex: { flex: 1 },
  alignStart: { alignSelf: 'flex-start' },
  galleryHeader: {
    position: 'absolute',
    left: t.spacing.md,
    right: t.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', gap: t.spacing.xs },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    paddingTop: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.lg,
    borderTopRightRadius: t.radius.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.line,
    marginBottom: t.spacing.sm,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  title: { marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, marginTop: t.spacing.xs },
  facts: { flexDirection: 'row', gap: t.spacing.xs, marginTop: t.spacing.md },
  fact: {
    flex: 1,
    minWidth: 0,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: 10,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.canvas,
  },
  counts: { marginTop: t.spacing.xs },
  sellerBlock: {
    marginTop: t.spacing.md,
    paddingVertical: t.spacing.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.line,
  },
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
  section: { marginTop: t.spacing.lg, gap: t.spacing.xs },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.sm,
    backgroundColor: t.colors.canvas,
    borderRadius: t.radius.md,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.brandTint,
  },
  similar: { marginTop: t.spacing.xl, marginHorizontal: -t.spacing.md },
  similarTitle: { paddingHorizontal: t.spacing.md, marginBottom: t.spacing.xs },
  similarList: { paddingHorizontal: t.spacing.md, gap: t.spacing.sm },
  unavailable: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, minHeight: t.touch.min, paddingHorizontal: 4 },
}));

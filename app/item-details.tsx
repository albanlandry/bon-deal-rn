// app/item-details.tsx — Item details (doc §4.1): full-bleed gallery, price
// first, seller trust card, safety banner, similar items, sticky CTA bar.
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Badge,
  Button,
  ErrorState,
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
import { haptics } from '@/lib/haptics';
import { AGE_LABELS, categoryLabel, conditionLabel } from '@/constants/catalog';
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

  const bonPrixMutation = useMutation({
    mutationFn: () => priceCheck(postId),
    onSuccess: setBonPrix,
    onError: (e: any) => showToast.error('Bon prix ?', priceCheckErrorMessage(e)),
  });

  // Like/unlike with optimistic cache update (Doherty); post.liked_by_me is the source of truth.
  const likeMutation = useMutation({
    mutationFn: (currentlyLiked: boolean) => (currentlyLiked ? unlikePost(postId) : likePost(postId)),
    onMutate: async (currentlyLiked: boolean) => {
      haptics.light();
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

  const headerOverlay = (
    <View style={[styles.galleryHeader, { top: insets.top + 4 }]}>
      <IconButton
        icon="arrow-back"
        label="Retour"
        variant="overlay"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
      />
      <View style={styles.row}>
        <IconButton icon="share-social-outline" label="Partager l'annonce" variant="overlay" onPress={handleShare} />
        {!isOwner && (
          <IconButton icon="flag-outline" label="Signaler l'annonce" variant="overlay" onPress={() => setReportOpen(true)} />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <ItemGallery images={imageUrls} title={post.title} overlay={headerOverlay} />

        <View style={styles.body}>
          {/* Price first, then badges */}
          <Price amount={post.price} isFree={post.is_free} isExchange={!!post.exchange_items} size="lg" />
          {post.is_free && (
            <AppText variant="small" color="inkMuted">
              Donnez une seconde vie à cet objet.
            </AppText>
          )}
          <View style={styles.badges}>
            {stateBadge && <Badge label={stateBadge.label} tone={stateBadge.tone} />}
            {post.is_free && <Badge label="Gratuit" tone="success" icon="gift-outline" />}
            {!!post.exchange_items && <Badge label="Échange possible" tone="trust" icon="swap-horizontal" />}
            {post.allow_negotiation && !post.is_free && <Badge label="Négociable" tone="brand" icon="chatbubbles-outline" />}
          </View>

          <AppText variant="h2" accessibilityRole="header">
            {post.title}
          </AppText>
          <AppText variant="caption" color="inkMuted">
            Publié {formatRelativeTime(post.created_at).toLowerCase()}
            {` · ${plural(post.views_count, 'vue')} · ${plural(post.likes_count, 'favori')}`}
          </AppText>

          {facts.length > 0 && (
            <View style={styles.facts}>
              {facts.map((f) => (
                <View key={f.label} style={styles.fact}>
                  <Ionicons name={f.icon} size={18} color={t.colors.inkMuted} />
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

          {!!post.exchange_items && (
            <View style={styles.section}>
              <AppText variant="h3">Échange contre</AppText>
              <AppText variant="body" color="inkMuted">
                {post.exchange_items}
              </AppText>
            </View>
          )}

          {/* Bon prix ? (buyer-facing price check) */}
          {!post.is_free && !!post.price && !bonPrix && (
            <Button
              label={bonPrixMutation.isPending ? 'Analyse du marché…' : "C'est un bon prix ?"}
              icon="analytics-outline"
              variant="secondary"
              size="sm"
              loading={bonPrixMutation.isPending}
              onPress={() => bonPrixMutation.mutate()}
              style={styles.alignStart}
            />
          )}
          {bonPrix && <ItemPriceCheckCard check={bonPrix} onDismiss={() => setBonPrix(null)} />}

          {/* Seller trust card */}
          <View style={styles.section}>
            <AppText variant="h3">Vendeur</AppText>
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
            {!isOwner && (
              <Button
                label="Signaler cette annonce"
                icon="flag-outline"
                variant="ghost"
                size="sm"
                onPress={() => setReportOpen(true)}
                style={styles.alignStart}
              />
            )}
          </View>

          {!!post.description && (
            <View style={styles.section}>
              <AppText variant="h3">Description</AppText>
              <AppText variant="body">{post.description}</AppText>
            </View>
          )}

          {(locationText || post.pickup_location_note) && (
            <View style={styles.section}>
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
            </View>
          )}

          {!isOwner && <SafetyBanner />}
        </View>

        {similar.length > 0 && (
          <View style={styles.similar}>
            <AppText variant="h3" style={styles.similarTitle}>
              Annonces similaires
            </AppText>
            <FlatList
              data={similar}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => String(p.id)}
              contentContainerStyle={styles.similarList}
              renderItem={({ item }) => (
                <ListingCard
                  post={item}
                  width={160}
                  onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
                />
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA bar — thumb zone (Fitts) */}
      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
            <IconButton
              icon={post.liked_by_me ? 'heart' : 'heart-outline'}
              label={post.liked_by_me ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              color={post.liked_by_me ? 'brandStrong' : 'ink'}
              variant="outline"
              disabled={likeMutation.isPending}
              onPress={() => likeMutation.mutate(post.liked_by_me)}
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
              <Button
                label="Faire une offre"
                haptic
                onPress={() => router.push({ pathname: '/make-offer', params: { postId: String(post.id) } })}
                style={styles.flex}
              />
            )}
          </>
        )}
      </View>
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

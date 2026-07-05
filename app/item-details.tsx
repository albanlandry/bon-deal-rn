// app/item-details.tsx - Item details screen
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { showToast } from '../components/atoms/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { postByIdQuery, priceCheck, likePost, unlikePost } from '@/lib/api/posts';
import { getOrCreateConversation } from '@/lib/api/conversations';
import { ApiError } from '@/lib/api';
import { formatAmount, formatRelativeTime } from '@/lib/format';
import type { BdPost, BdPriceCheck } from '@/constants/types';

const { width: screenWidth } = Dimensions.get('window');

// --- Bon prix ? (ephemeral verdict card) ------------------------------------

const VERDICT_META = {
  bonne_affaire: { label: 'Bonne affaire', color: '#28A745' },
  prix_correct: { label: 'Prix correct', color: '#444' },
  trop_cher: { label: 'Prix au-dessus du marché', color: '#D9534F' },
} as const;

function priceCheckErrorMessage(e: unknown): string {
  const status = e instanceof ApiError ? e.status : 0;
  if (status === 503) return "L'assistant prix n'est pas disponible pour le moment.";
  if (status === 429) return 'Trop de vérifications — réessayez plus tard.';
  if (status === 409) return "Cette annonce n'a pas de prix à vérifier.";
  return "Impossible de vérifier le prix. Réessayez.";
}

function confidenceLabel(c: number): string {
  if (c >= 0.7) return 'Avis fiable';
  if (c >= 0.4) return 'Avis indicatif';
  return 'À prendre avec prudence';
}

function BonPrixCard({ check, onDismiss }: { check: BdPriceCheck; onDismiss: () => void }) {
  const meta = VERDICT_META[check.verdict];
  const m = check.market;
  const span = m ? m.range_max - m.range_min : 0;
  const dotPos = m
    ? Math.min(Math.max(span > 0 ? (check.listed_price - m.range_min) / span : 0.5, 0), 1)
    : 0.5;
  const deltaLine =
    check.delta_pct != null
      ? ` · ${check.delta_pct > 0 ? '+' : ''}${Math.round(check.delta_pct)}% vs marché`
      : '';

  return (
    <View style={styles.bonprixCard}>
      <View style={styles.bonprixTitleRow}>
        <Text style={styles.bonprixTitle}>💡 Bon prix ?</Text>
        <Text style={styles.bonprixPrivate}>Visible par vous seul</Text>
      </View>
      <Text style={[styles.bonprixVerdict, { color: meta.color }]}>{meta.label}</Text>
      <Text style={styles.bonprixRationale}>{check.rationale_fr}</Text>
      {m ? (
        <>
          <Text style={styles.bonprixMeta}>
            Marché : {formatAmount(m.range_min)} – {formatAmount(m.range_max)} ·{' '}
            {m.comparable_count} annonce{m.comparable_count > 1 ? 's' : ''} similaire
            {m.comparable_count > 1 ? 's' : ''}
            {deltaLine}
          </Text>
          <View style={styles.bonprixBarTrack}>
            <View style={[styles.bonprixBarDot, { left: `${dotPos * 100}%` }]} />
          </View>
        </>
      ) : (
        <Text style={styles.bonprixMeta}>
          Peu d'annonces similaires — avis basé sur l'annonce elle-même
        </Text>
      )}
      {check.condition_flags_fr.map((flag, i) => (
        <Text key={i} style={styles.bonprixFlag}>⚠ {flag}</Text>
      ))}
      {!!check.warning && <Text style={styles.bonprixWarning}>{check.warning}</Text>}
      <View style={styles.bonprixFooterRow}>
        <Text style={styles.bonprixMeta}>{confidenceLabel(check.confidence)}</Text>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.bonprixDismiss}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ItemDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const postId = Number(id);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bonPrix, setBonPrix] = useState<BdPriceCheck | null>(null);

  const queryClient = useQueryClient();
  const { data: post, isLoading, error, refetch } = useQuery(postByIdQuery(postId));

  const bonPrixMutation = useMutation({
    mutationFn: () => priceCheck(postId),
    onSuccess: setBonPrix,
    onError: (e: any) => showToast.error('Bon prix ?', priceCheckErrorMessage(e)),
  });

  // Like/unlike with optimistic cache update; post.liked_by_me is the source of truth.
  const likeMutation = useMutation({
    mutationFn: (currentlyLiked: boolean) =>
      currentlyLiked ? unlikePost(postId) : likePost(postId),
    onMutate: async (currentlyLiked: boolean) => {
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
      router.push({
        pathname: '/chatroom',
        params: { conversationId: String(conv.id) },
      });
    },
    onError: (e: any) => {
      showToast.error('Échec', e?.message || "Impossible d'ouvrir la conversation.");
    },
  });

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.stateText}>Article introuvable.</Text>
        <TouchableOpacity style={styles.stateButton} onPress={() => router.back()}>
          <Text style={styles.stateButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
        <Text style={styles.stateText}>Impossible de charger cet article.</Text>
        <TouchableOpacity style={styles.stateButton} onPress={() => refetch()}>
          <Text style={styles.stateButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageUrls = post.images.map((img) => img.url);
  const isOwner = !!user && user.id === post.owner_id;
  const priceLabel = post.is_free ? 'Gratuit' : formatAmount(post.price);
  const locationText = [post.pickup_quartier, post.city].filter(Boolean).join(', ');

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    setIsFullscreen(true);
  };

  const handleNegotiate = () => {
    router.push({ pathname: '/make-offer', params: { postId: String(post.id) } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fullscreen Carousel Modal */}
      {isFullscreen && imageUrls.length > 0 && (
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsFullscreen(false)}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          <Carousel
            loop
            width={screenWidth}
            height={screenWidth}
            autoPlay={false}
            data={imageUrls}
            defaultIndex={currentImageIndex}
            scrollAnimationDuration={300}
            onSnapToItem={(index) => setCurrentImageIndex(index)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.fullscreenImageContainer}
                onPress={() => setIsFullscreen(false)}
                activeOpacity={1}>
                <Image source={{ uri: item }} style={styles.fullscreenImage} />
              </TouchableOpacity>
            )}
          />

          <View style={styles.fullscreenPagination}>
            {imageUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.fullscreenPaginationDot,
                  index === currentImageIndex && styles.fullscreenPaginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.sellerInfo}>
          <View style={styles.sellerAvatar}>
            <Ionicons name="person" size={20} color="#999" />
          </View>
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {post.owner_username ?? 'Vendeur'}
            </Text>
            <Text style={styles.postedTime}>
              Publié {formatRelativeTime(post.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/(tabs)/home')}>
            <Ionicons name="home" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          {imageUrls.length > 0 ? (
            <>
              <Carousel
                loop
                width={screenWidth}
                height={300}
                autoPlay={false}
                data={imageUrls}
                scrollAnimationDuration={300}
                onSnapToItem={(index) => setCurrentImageIndex(index)}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => handleImagePress(index)}
                    activeOpacity={0.9}>
                    <Image source={{ uri: item }} style={styles.productImage} />
                  </TouchableOpacity>
                )}
              />
              <View style={styles.paginationContainer}>
                {imageUrls.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={56} color="#ccc" />
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{post.title}</Text>

          <View style={styles.engagementContainer}>
            <View style={styles.engagementItem}>
              <Ionicons name="heart" size={16} color="#FF6B6B" />
              <Text style={styles.engagementText}>{post.likes_count}</Text>
            </View>
            <View style={styles.engagementItem}>
              <Ionicons name="eye" size={16} color="#666" />
              <Text style={styles.engagementText}>{post.views_count}</Text>
            </View>
            <View style={styles.engagementItem}>
              <Ionicons name="pricetag" size={16} color="#666" />
              <Text style={styles.engagementText}>{post.offer_count}</Text>
            </View>
          </View>

          <Text style={styles.productDescription}>{post.description}</Text>

          {/* Bon prix ? */}
          {!post.is_free && !!post.price && !bonPrix && (
            <TouchableOpacity
              style={styles.bonprixPill}
              onPress={() => bonPrixMutation.mutate()}
              disabled={bonPrixMutation.isPending}>
              {bonPrixMutation.isPending ? (
                <View style={styles.bonprixPillRow}>
                  <ActivityIndicator size="small" color="#6B4FA1" />
                  <Text style={styles.bonprixPillText}> Analyse du marché…</Text>
                </View>
              ) : (
                <Text style={styles.bonprixPillText}>💡 C'est un bon prix ?</Text>
              )}
            </TouchableOpacity>
          )}
          {bonPrix && <BonPrixCard check={bonPrix} onDismiss={() => setBonPrix(null)} />}

          {/* Location */}
          {(locationText || post.pickup_location_note) && (
            <View style={styles.locationSection}>
              <Text style={styles.sectionTitle}>Localisation</Text>
              <View style={styles.locationCard}>
                <Ionicons name="location" size={20} color={theme.colors.primary} />
                <View style={styles.locationTextWrap}>
                  {!!locationText && (
                    <Text style={styles.locationPrimary}>{locationText}</Text>
                  )}
                  {!!post.pickup_location_note && (
                    <Text style={styles.locationNote}>{post.pickup_location_note}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <TouchableOpacity
            style={styles.actionButton}
            disabled={likeMutation.isPending}
            onPress={() => likeMutation.mutate(post.liked_by_me)}>
            <Ionicons
              name={post.liked_by_me ? 'heart' : 'heart-outline'}
              size={24}
              color={post.liked_by_me ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomCenter}>
          <Text style={styles.price}>{priceLabel}</Text>
          {post.allow_negotiation && !isOwner && (
            <TouchableOpacity onPress={handleNegotiate}>
              <Text style={styles.negotiateText}>Negotier</Text>
            </TouchableOpacity>
          )}
        </View>

        {isOwner ? (
          <View style={[styles.contactButton, styles.contactButtonDisabled]}>
            <Text style={styles.contactButtonText}>Votre annonce</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => contactMutation.mutate()}
            disabled={contactMutation.isPending}>
            {contactMutation.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.contactButtonText}>Contacter</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.white,
  },
  stateText: {
    fontSize: 16,
    color: '#666',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  stateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
  },
  stateButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  headerButton: {
    padding: theme.spacing.sm,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  postedTime: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  productImage: {
    width: screenWidth,
    height: 300,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: screenWidth,
    height: 300,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#000',
  },
  productInfo: {
    paddingHorizontal: theme.spacing.lg,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: theme.spacing.sm,
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  engagementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bonprixPill: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E4D9F8',
    borderRadius: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    marginTop: theme.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  bonprixPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bonprixPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B4FA1',
  },
  bonprixCard: {
    backgroundColor: '#F5F0FF',
    borderColor: '#E4D9F8',
    borderWidth: 1,
    borderRadius: 14,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  bonprixTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bonprixTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B4FA1',
  },
  bonprixPrivate: {
    fontSize: 10,
    color: '#8a8a8a',
  },
  bonprixVerdict: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  bonprixRationale: {
    fontSize: 13,
    color: '#444',
    marginTop: 4,
    lineHeight: 18,
  },
  bonprixMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  bonprixBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4D9F8',
    marginTop: 6,
  },
  bonprixBarDot: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    backgroundColor: '#6B4FA1',
  },
  bonprixFlag: {
    backgroundColor: '#FFF6E5',
    color: '#B45309',
    fontSize: 12,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  bonprixWarning: {
    backgroundColor: '#FDECEC',
    color: '#C0392B',
    fontSize: 12,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  bonprixFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bonprixDismiss: {
    fontSize: 12,
    color: '#6B4FA1',
    fontWeight: '600',
    marginTop: 8,
  },
  locationSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: theme.spacing.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    borderRadius: 12,
    padding: theme.spacing.md,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: theme.colors.grayLight,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  locationNote: {
    fontSize: 13,
    color: theme.colors.gray,
    marginTop: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grayLight,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  bottomCenter: {
    flex: 1,
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  negotiateText: {
    fontSize: 14,
    color: theme.colors.gray,
    textDecorationLine: 'underline',
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  contactButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  contactButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1001,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenWidth,
    resizeMode: 'contain',
  },
  fullscreenPagination: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPaginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  fullscreenPaginationDotActive: {
    backgroundColor: 'white',
  },
});

// app/item-details.tsx - Item details screen
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { postByIdQuery } from '@/lib/api/posts';
import { getOrCreateConversation } from '@/lib/api/conversations';
import { formatAmount, formatRelativeTime } from '@/lib/format';

const { width: screenWidth } = Dimensions.get('window');

export default function ItemDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const postId = Number(id);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: post, isLoading, error, refetch } = useQuery(postByIdQuery(postId));

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
            onPress={() => setIsLiked((v) => !v)}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#FF6B6B' : '#666'}
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

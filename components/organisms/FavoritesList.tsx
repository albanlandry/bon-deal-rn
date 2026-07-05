// components/organisms/FavoritesList.tsx
// Shared liked-posts list + states + optimistic remove. Used by both the
// favorites tab and the stack favorites screen (they differ only in header).
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ProductCard from '../molecules/ProductCard';
import { showToast } from '../atoms/Toast';
import { theme } from '../../utils/theme';
import { ApiError } from '@/lib/api';
import { likedPostsQuery, unlikePost } from '@/lib/api/posts';
import { toCardProps } from '@/lib/mapPost';
import type { BdPost, BdPostListResponse } from '@/constants/types';

const LIKED_KEY = ['posts', 'liked'] as const;

function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status >= 500) return 'Erreur serveur. Réessayez.';
    return e.message;
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function FavoritesList() {
  const router = useRouter();
  const qc = useQueryClient();
  const liked = useQuery(likedPostsQuery());
  const posts = liked.data?.posts ?? [];

  const unlike = useMutation({
    mutationFn: (id: number) => unlikePost(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: LIKED_KEY });
      const prev = qc.getQueryData<BdPostListResponse>(LIKED_KEY);
      qc.setQueryData<BdPostListResponse>(LIKED_KEY, (old) =>
        old
          ? {
              ...old,
              posts: old.posts.filter((p) => p.id !== id),
              total_posts: Math.max(0, old.total_posts - 1),
            }
          : old,
      );
      return { prev };
    },
    onError: (e, _id, ctx) => {
      // 400 = already unliked; keep the optimistic removal.
      if (e instanceof ApiError && e.status === 400) return;
      if (ctx?.prev) qc.setQueryData(LIKED_KEY, ctx.prev);
      showToast.error('Échec', errMessage(e));
    },
    onSettled: (_d, _e, id) => {
      qc.invalidateQueries({ queryKey: LIKED_KEY });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  const handleRemove = (post: BdPost) => {
    unlike.mutate(post.id);
  };

  const renderProduct = ({ item }: { item: BdPost }) => {
    const card = toCardProps(item);
    return (
      <View style={styles.productWrapper}>
        <ProductCard
          {...card}
          onPress={() =>
            router.push({ pathname: '/item-details', params: { id: String(item.id) } })
          }
        />
        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item)}>
          <Ionicons name="heart" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    );
  };

  if (liked.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (liked.isError) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={56} color="#FF6B6B" />
        <Text style={styles.emptyTitle}>Impossible de charger vos favoris</Text>
        <TouchableOpacity style={styles.browseButton} onPress={() => liked.refetch()}>
          <Text style={styles.browseButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderProduct}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.listContent, posts.length === 0 && styles.emptyContainer]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={liked.isRefetching}
          onRefresh={() => liked.refetch()}
          tintColor={theme.colors.primary}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={theme.colors.gray} />
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptyMessage}>
            Explorez les annonces et ajoutez vos coups de cœur ici.
          </Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.push('/(tabs)/home')}>
            <Text style={styles.browseButtonText}>Parcourir les annonces</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  productWrapper: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
    marginVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

// components/organisms/FavoritesList.tsx
// Liked posts grid shared by the Favoris tab and the stack favorites screen.
// Unlike is optimistic (removed instantly) with an "Annuler" undo toast that
// re-likes the post (Doherty: no confirm dialog, reversible action instead).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ApiError } from '@/lib/api';
import { applyLikeLocally } from '@/lib/api/likeToggle';
import { likedPostsQuery, likePost, unlikePost } from '@/lib/api/posts';
import { haptics } from '@/lib/haptics';
import type { BdPost, BdPostListResponse } from '@/constants/types';
import { showToast } from '../atoms/Toast';
import EmptyState, { ErrorState } from '../molecules/EmptyState';
import ListingGrid, { type ListingGridProps } from './ListingGrid';

const LIKED_KEY = ['posts', 'liked'] as const;

function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status >= 500) return 'Erreur serveur. Réessayez.';
    return e.message;
  }
  return 'Une erreur est survenue. Réessayez.';
}

export interface FavoritesListProps {
  header?: React.ReactElement | null;
  /** Scroll passthrough (tab screen drives the hiding tab bar). */
  onScroll?: ListingGridProps['onScroll'];
  contentPaddingBottom?: number;
}

export default function FavoritesList({ header, onScroll, contentPaddingBottom }: FavoritesListProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const liked = useQuery(likedPostsQuery());
  const posts = liked.data?.posts ?? [];

  const relike = useMutation({
    mutationFn: (post: BdPost) => likePost(post.id),
    onMutate: async (post: BdPost) => {
      await qc.cancelQueries({ queryKey: LIKED_KEY });
      qc.setQueryData<BdPostListResponse>(LIKED_KEY, (old) =>
        old && !old.posts.some((p) => p.id === post.id)
          ? { ...old, posts: [{ ...post, liked_by_me: true }, ...old.posts], total_posts: old.total_posts + 1 }
          : old,
      );
      applyLikeLocally(qc, post.id, true);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 400) return; // already liked
      showToast.error('Échec', errMessage(e));
    },
    onSettled: (_d, _e, post) => {
      qc.invalidateQueries({ queryKey: LIKED_KEY });
      qc.invalidateQueries({ queryKey: ['post', post.id] });
    },
  });

  const unlike = useMutation({
    mutationFn: (post: BdPost) => unlikePost(post.id),
    onMutate: async (post: BdPost) => {
      await qc.cancelQueries({ queryKey: LIKED_KEY });
      const prev = qc.getQueryData<BdPostListResponse>(LIKED_KEY);
      qc.setQueryData<BdPostListResponse>(LIKED_KEY, (old) =>
        old
          ? {
              ...old,
              posts: old.posts.filter((p) => p.id !== post.id),
              total_posts: Math.max(0, old.total_posts - 1),
            }
          : old,
      );
      applyLikeLocally(qc, post.id, false);
      return { prev };
    },
    onSuccess: (_d, post) => {
      showToast.undo('Retiré des favoris', () => relike.mutate(post));
    },
    onError: (e, post, ctx) => {
      // 400 = already unliked; keep the optimistic removal.
      if (e instanceof ApiError && e.status === 400) return;
      if (ctx?.prev) qc.setQueryData(LIKED_KEY, ctx.prev);
      applyLikeLocally(qc, post.id, true);
      showToast.error('Échec', errMessage(e));
    },
    onSettled: (_d, _e, post) => {
      qc.invalidateQueries({ queryKey: ['post', post.id] });
    },
  });

  const onToggleLike = useCallback(
    (post: BdPost) => {
      haptics.light();
      unlike.mutate(post);
    },
    [unlike],
  );

  if (liked.isError && posts.length === 0) {
    return <ErrorState message="Impossible de charger vos favoris." onRetry={() => liked.refetch()} />;
  }

  return (
    <ListingGrid
      posts={posts}
      loading={liked.isLoading}
      refreshing={liked.isRefetching}
      onRefresh={() => liked.refetch()}
      onToggleLike={onToggleLike}
      showState
      onScroll={onScroll}
      contentPaddingBottom={contentPaddingBottom}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <EmptyState
          icon="heart-outline"
          title="Aucun favori pour l’instant"
          message="Touchez le cœur d’une annonce pour la retrouver ici."
          actionLabel="Parcourir les annonces"
          onAction={() => router.push('/(tabs)/home')}
        />
      }
    />
  );
}

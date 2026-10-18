/**
 * Optimistic like / unlike (Doherty threshold): the heart flips instantly in
 * every cached post list (feed, search results, liked, mine) and in the
 * post detail cache, then the server call confirms. ApiError 400 means the
 * post was already in the requested state — keep the optimistic value.
 */
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { likePost, unlikePost } from '@/lib/api/posts';
import type { BdPost } from '@/constants/types';

function patchPost(p: BdPost, id: number, liked: boolean): BdPost {
  if (p.id !== id || p.liked_by_me === liked) return p;
  return { ...p, liked_by_me: liked, likes_count: Math.max(0, p.likes_count + (liked ? 1 : -1)) };
}

function patchAny(data: any, id: number, liked: boolean): any {
  if (!data) return data;
  if (Array.isArray(data.pages)) {
    return {
      ...data,
      pages: data.pages.map((pg: any) =>
        pg && Array.isArray(pg.posts) ? { ...pg, posts: pg.posts.map((p: BdPost) => patchPost(p, id, liked)) } : pg,
      ),
    };
  }
  if (Array.isArray(data.posts)) {
    return { ...data, posts: data.posts.map((p: BdPost) => patchPost(p, id, liked)) };
  }
  return data;
}

export function applyLikeLocally(qc: QueryClient, id: number, liked: boolean) {
  qc.setQueriesData({ queryKey: ['posts'] }, (old: any) => patchAny(old, id, liked));
  qc.setQueryData<BdPost>(['post', id], (old) => (old ? patchPost(old, id, liked) : old));
}

export function useToggleLike(onError?: (e: unknown) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, like }: { id: number; like: boolean }) => {
      try {
        if (like) await likePost(id);
        else await unlikePost(id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) return; // already in state
        throw e;
      }
    },
    onMutate: async ({ id, like }) => {
      await qc.cancelQueries({ queryKey: ['posts'] });
      applyLikeLocally(qc, id, like);
    },
    onError: (e, { id, like }) => {
      applyLikeLocally(qc, id, !like);
      onError?.(e);
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['posts', 'liked'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
  });
}

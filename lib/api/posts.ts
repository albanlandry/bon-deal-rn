import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BdPost, BdPostListResponse, BdPriceCheck } from '@/constants/types';

interface PostResponse {
  success: boolean;
  message: string;
  post: BdPost;
}

const PAGE_SIZE = 20;

export function postByIdQuery(id: number) {
  return queryOptions({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await apiFetch<PostResponse>(`/posts/${id}`);
      return res.post;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

export type PostSort = 'date_new' | 'date_old' | 'price_low' | 'price_high';

export interface FeedParams {
  search?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  sort?: PostSort;
}

const SORT_PARAM: Record<PostSort, string | null> = {
  date_new: null, // backend default (created_at desc)
  date_old: JSON.stringify([{ id: 'created_at', desc: false }]),
  price_low: JSON.stringify([{ id: 'price', desc: false }]),
  price_high: JSON.stringify([{ id: 'price', desc: true }]),
};

function buildFeedQuery(params: FeedParams, page: number): string {
  const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.categories?.length) q.set('categories', params.categories.join(','));
  if (params.minPrice != null) q.set('min_price', String(params.minPrice));
  if (params.maxPrice != null) q.set('max_price', String(params.maxPrice));
  if (params.condition?.length) q.set('condition', params.condition.join(','));
  const sort = params.sort ? SORT_PARAM[params.sort] : null;
  if (sort) q.set('sort', sort);
  return q.toString();
}

/** Paginated buyer-facing feed / search (GET /posts). */
export function postsInfiniteQuery(params: FeedParams = {}) {
  return infiniteQueryOptions({
    queryKey: ['posts', params],
    queryFn: ({ pageParam }) =>
      apiFetch<BdPostListResponse>(`/posts?${buildFeedQuery(params, pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.offset + last.limit < last.total_posts
        ? last.offset / last.limit + 2
        : undefined,
  });
}

/** The caller's own posts, all states (GET /posts/mine). */
export function myPostsQuery(states?: string[]) {
  return queryOptions({
    queryKey: ['posts', 'mine', states ?? null],
    queryFn: () => {
      const q = new URLSearchParams({ page: '1', limit: '100' });
      if (states?.length) q.set('states', states.join(','));
      return apiFetch<BdPostListResponse>(`/posts/mine?${q.toString()}`);
    },
  });
}

/** Posts the caller has liked (GET /posts/liked). */
export function likedPostsQuery() {
  return queryOptions({
    queryKey: ['posts', 'liked'],
    queryFn: () => apiFetch<BdPostListResponse>('/posts/liked?page=1&limit=100'),
  });
}

export async function createPost(form: FormData): Promise<BdPost> {
  const res = await apiFetch<PostResponse>('/posts', { method: 'POST', body: form });
  return res.post;
}

export async function updatePost(id: number, patch: Partial<Record<string, unknown>>): Promise<BdPost> {
  const res = await apiFetch<PostResponse>(`/posts/${id}`, { method: 'PATCH', body: patch });
  return res.post;
}

export async function deletePost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}`, { method: 'DELETE' });
}

export async function deletePostImage(postId: number, imageId: number): Promise<void> {
  await apiFetch(`/posts/${postId}/images/${imageId}`, { method: 'DELETE' });
}

/** Like/unlike. Callers may treat ApiError.status===400 as already-in-state. */
export async function likePost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/like`, { method: 'POST' });
}

export async function unlikePost(id: number): Promise<void> {
  await apiFetch(`/posts/${id}/like`, { method: 'DELETE' });
}

/** Ephemeral Bon prix ? verdict for a priced listing. */
export async function priceCheck(postId: number): Promise<BdPriceCheck> {
  const res = await apiFetch<{ success: boolean; price_check: BdPriceCheck }>(
    `/posts/${postId}/price_check`,
    { method: 'POST' },
  );
  return res.price_check;
}

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

export type PostSort = 'date_new' | 'date_old' | 'price_low' | 'price_high' | 'distance';

export interface NearParams {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface FeedParams {
  search?: string;
  categories?: string[];
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  /** Exact pickup quartier. */
  quartier?: string;
  /** "Près de moi": only listings within the radius; rows get distance_km. */
  near?: NearParams;
  sort?: PostSort;
  /** true: free listings only; false: non-free only; unset: all (`is_free`). */
  isFree?: boolean;
}

const SORT_PARAM: Record<PostSort, string | null> = {
  // Backend default: created_at desc, or relevance when `search` is set.
  date_new: null,
  date_old: JSON.stringify([{ id: 'created_at', desc: false }]),
  price_low: JSON.stringify([{ id: 'price', desc: false }]),
  price_high: JSON.stringify([{ id: 'price', desc: true }]),
  distance: JSON.stringify([{ id: 'distance' }]),
};

/** Coordinates rounded to ~100 m so query keys stay stable as GPS jitters. */
export function roundCoord(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function buildFeedQuery(params: FeedParams, page: number): string {
  const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (params.search?.trim()) q.set('search', params.search.trim());
  if (params.categories?.length) q.set('categories', params.categories.join(','));
  if (params.minPrice != null) q.set('min_price', String(params.minPrice));
  if (params.maxPrice != null) q.set('max_price', String(params.maxPrice));
  if (params.condition?.length) q.set('condition', params.condition.join(','));
  if (params.quartier) q.set('quartier', params.quartier);
  if (params.isFree != null) q.set('is_free', String(params.isFree));
  if (params.near) {
    q.set('near_lat', String(params.near.lat));
    q.set('near_lng', String(params.near.lng));
    q.set('radius_km', String(params.near.radiusKm));
  }
  // Distance sort needs a position; fall back to the default order otherwise.
  const sortKey = params.sort === 'distance' && !params.near ? undefined : params.sort;
  const sort = sortKey ? SORT_PARAM[sortKey] : null;
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

export interface CreatePostResult {
  post: BdPost;
  /** Same owner posted the same title in the last 30 days (warning only). */
  possibleDuplicateOf: number | null;
}

/** POST /posts (multipart). Photos go as `image_keys` (direct uploads). */
export async function createPost(form: FormData): Promise<CreatePostResult> {
  const res = await apiFetch<PostResponse & { possible_duplicate_of?: number | null }>('/posts', {
    method: 'POST',
    body: form,
  });
  return { post: res.post, possibleDuplicateOf: res.possible_duplicate_of ?? null };
}

/** Attach already-uploaded photos (keys from /uploads/presign) to an own post. */
export async function attachPostImages(
  postId: number,
  keys: string[],
): Promise<{ id: number; status: string }[]> {
  const res = await apiFetch<{ success: boolean; images: { id: number; status: string }[] }>(
    `/posts/${postId}/images`,
    { method: 'POST', body: { keys } },
  );
  return res.images;
}

/** Put a published or expired listing back online for a full period. */
export async function renewPost(id: number): Promise<BdPost | null> {
  const res = await apiFetch<{ success: boolean; post?: BdPost }>(`/posts/${id}/renew`, {
    method: 'POST',
  });
  return res.post ?? null;
}

/** Title suggestions in the user's city (GET /search/suggest, q: 2–60 chars). */
export function searchSuggestQuery(q: string) {
  const term = q.trim().slice(0, 60);
  return queryOptions({
    queryKey: ['search', 'suggest', term.toLowerCase()],
    queryFn: async () => {
      const res = await apiFetch<{ suggestions: string[] }>(
        `/search/suggest?q=${encodeURIComponent(term)}`,
      );
      return res.suggestions ?? [];
    },
    enabled: term.length >= 2,
    staleTime: 60_000,
  });
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

/** Increment the share counter after the native share sheet (fire-and-forget). */
export async function sharePost(postId: number): Promise<void> {
  await apiFetch(`/posts/${postId}/share`, { method: 'POST' });
}

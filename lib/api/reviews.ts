import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BdReviewListResponse } from '@/constants/types';

const PAGE = 20;

/** Paginated visible reviews of a user, newest first (GET /users/{id}/reviews). */
export function userReviewsInfiniteQuery(userId: number | null | undefined) {
  return infiniteQueryOptions({
    queryKey: ['reviews', userId],
    queryFn: ({ pageParam }) =>
      apiFetch<BdReviewListResponse>(`/users/${userId}/reviews?page=${pageParam}&limit=${PAGE}`),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.offset + last.limit < last.total ? last.offset / last.limit + 2 : undefined,
    enabled: !!userId && userId > 0,
  });
}

/**
 * Lightweight trust summary for a user: total visible reviews + the user's
 * average rating, read from the `reviewee` brief of the latest review.
 * Returns nulls when the user has no reviews — callers must then show
 * nothing rather than invent a number.
 */
export function userReviewSummaryQuery(userId: number | null | undefined) {
  return queryOptions({
    queryKey: ['reviews', userId, 'summary'],
    queryFn: async () => {
      const res = await apiFetch<BdReviewListResponse>(`/users/${userId}/reviews?page=1&limit=1`);
      const brief = res.reviews[0]?.reviewee ?? null;
      return {
        total: res.total,
        avgRating: brief?.avg_rating ?? null,
        avatarUrl: brief?.avatar_url ?? null,
      };
    },
    enabled: !!userId && userId > 0,
    staleTime: 5 * 60_000,
  });
}

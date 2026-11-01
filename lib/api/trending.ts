/**
 * "Tendances à <ville>" (docs/12, Rechercher): the most searched terms in a
 * city over the last days, from real searches only.
 * GET /v1/search/trending?city=<city>&limit=5 → { items: [{query, count}], city, days }.
 * The count is never shown (docs/06 ethics: no popularity numbers); callers
 * hide the section on empty or error.
 */
import { queryOptions, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface TrendingItem {
  query: string;
  count: number;
}

export interface TrendingResponse {
  items: TrendingItem[];
  city?: string | null;
  days?: number;
}

export function trendingSearchesQuery(city: string | null | undefined, limit = 5) {
  const c = city?.trim() ?? '';
  return queryOptions({
    queryKey: ['search', 'trending', c.toLowerCase(), limit],
    queryFn: async (): Promise<TrendingItem[]> => {
      const q = new URLSearchParams({ city: c, limit: String(limit) });
      const res = await apiFetch<TrendingResponse>(`/search/trending?${q.toString()}`);
      return (res?.items ?? [])
        .filter((i) => typeof i?.query === 'string' && i.query.trim())
        .slice(0, limit);
    },
    enabled: c.length > 0,
    staleTime: 10 * 60_000,
    // A missing endpoint (older server) or an error just hides the section.
    retry: false,
  });
}

export function useTrendingSearches(city: string | null | undefined, limit = 5) {
  return useQuery(trendingSearchesQuery(city, limit));
}

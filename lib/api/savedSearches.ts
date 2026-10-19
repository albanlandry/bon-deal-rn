/** Saved searches with new-listing alerts (Phase 4). */
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
import type { BdSavedSearch, BdSavedSearchFilters } from '@/constants/types';
import type { FeedParams } from '@/lib/api/posts';
import { formatAmount, formatNumber } from '@/lib/format';

export function savedSearchesQuery() {
  return queryOptions({
    queryKey: ['saved-searches'],
    queryFn: async () =>
      (await apiFetch<{ saved_searches: BdSavedSearch[] }>('/saved-searches')).saved_searches,
  });
}

export async function createSavedSearch(input: {
  name: string;
  filters: BdSavedSearchFilters;
  alertsEnabled: boolean;
}): Promise<BdSavedSearch> {
  const res = await apiFetch<{ saved_search: BdSavedSearch }>('/saved-searches', {
    method: 'POST',
    body: { name: input.name.trim(), filters: input.filters, alerts_enabled: input.alertsEnabled },
  });
  return res.saved_search;
}

export async function updateSavedSearch(
  id: number,
  patch: { name?: string; alerts_enabled?: boolean; filters?: BdSavedSearchFilters },
): Promise<BdSavedSearch> {
  const res = await apiFetch<{ saved_search: BdSavedSearch }>(`/saved-searches/${id}`, {
    method: 'PATCH',
    body: patch,
  });
  return res.saved_search;
}

export async function deleteSavedSearch(id: number): Promise<void> {
  await apiFetch(`/saved-searches/${id}`, { method: 'DELETE' });
}

export function savedSearchErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400 || e.status === 409) {
      return /20|max|limit/i.test(e.message)
        ? 'Vous avez atteint 20 recherches enregistrées. Supprimez-en une.'
        : e.message;
    }
    if (e.status === 404) return 'Cette recherche n’existe plus.';
    if (e.status === 422) return 'Vérifiez le nom de la recherche.';
  }
  return 'Action impossible. Réessayez.';
}

/** Feed params → saved-search filters (API field names). */
export function feedToFilters(p: FeedParams): BdSavedSearchFilters {
  const f: BdSavedSearchFilters = {};
  if (p.search?.trim()) f.search = p.search.trim();
  if (p.categories?.length) f.categories = p.categories;
  if (p.minPrice != null) f.min_price = p.minPrice;
  if (p.maxPrice != null) f.max_price = p.maxPrice;
  if (p.condition?.length) f.condition = p.condition;
  if (p.quartier) f.quartier = p.quartier;
  if (p.near) {
    f.near_lat = p.near.lat;
    f.near_lng = p.near.lng;
    f.radius_km = p.near.radiusKm;
  }
  return f;
}

/** Saved-search filters → search-results route params (strings). */
export function filtersToRouteParams(f: BdSavedSearchFilters): Record<string, string> {
  const r: Record<string, string> = {};
  if (f.search) r.query = f.search;
  if (f.categories?.length) r.categories = f.categories.join(',');
  if (f.min_price != null) r.minPrice = String(f.min_price);
  if (f.max_price != null) r.maxPrice = String(f.max_price);
  if (f.condition?.length) r.condition = f.condition.join(',');
  if (f.quartier) r.quartier = f.quartier;
  if (f.near_lat != null && f.near_lng != null) {
    r.nearLat = String(f.near_lat);
    r.nearLng = String(f.near_lng);
    if (f.radius_km != null) r.radiusKm = String(f.radius_km);
  }
  return r;
}

/** Short French summary of a saved search's filters. */
export function describeFilters(f: BdSavedSearchFilters, categoryLabel: (v: string) => string): string {
  const parts: string[] = [];
  if (f.search) parts.push(`« ${f.search} »`);
  if (f.categories?.length) parts.push(f.categories.map(categoryLabel).join(', '));
  if (f.min_price != null && f.max_price != null)
    parts.push(`${formatNumber(f.min_price)} – ${formatAmount(f.max_price)}`);
  else if (f.max_price != null) parts.push(`≤ ${formatAmount(f.max_price)}`);
  else if (f.min_price != null) parts.push(`≥ ${formatAmount(f.min_price)}`);
  if (f.quartier) parts.push(f.quartier);
  if (f.radius_km != null && f.near_lat != null) parts.push(`à moins de ${f.radius_km} km`);
  return parts.join(' · ') || 'Toutes les annonces';
}

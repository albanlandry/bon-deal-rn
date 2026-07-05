import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface BdQuartier {
  id: number;
  city: string;
  name: string;
  usage_count: number;
}

interface QuartiersResponse {
  success: boolean;
  city: string;
  total: number;
  quartiers: BdQuartier[];
}

/** Approved quartiers for a city, most-used first (GET /quartiers?city=). */
export function quartiersQuery(city: string | null | undefined) {
  return queryOptions({
    queryKey: ['quartiers', city],
    queryFn: () => apiFetch<QuartiersResponse>(`/quartiers?city=${encodeURIComponent(city!)}`),
    enabled: !!city,
  });
}

import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface BdAppConfig {
  max_images: number;
  listing_expiry_days: number;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  min_app_version: string | null;
  latest_app_version: string | null;
  android_store_url: string | null;
  ios_store_url: string | null;
  support_email: string | null;
  default_country: { iso2: string; phone_code: string | null; currency_code: string | null } | null;
}

/** GET /app-config: public, never blocked by maintenance or the version gate. */
export function fetchAppConfig(): Promise<BdAppConfig> {
  return apiFetch<BdAppConfig>('/app-config', { skipUnauthorized: true });
}

export function appConfigQuery() {
  return queryOptions({
    queryKey: ['app-config'],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60_000,
  });
}

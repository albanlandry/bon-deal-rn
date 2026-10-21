/**
 * Availability zones (docs/08 §A): enabled countries → cities → approved
 * quartiers. Users and posts still reference cities and quartiers by name;
 * these lists only feed the pickers and filters.
 */
import { queryOptions, useQuery, useQueries } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { appConfigQuery } from '@/lib/api/appConfig';
import { quartiersQuery } from '@/lib/api/quartiers';
import { sameName } from '@/lib/textSearch';

export interface BdCountry {
  iso2: string;
  name: string;
  phone_code: string | null;
  currency_code: string | null;
  flag: string | null;
  is_default: boolean;
}

export interface BdCity {
  id: number;
  name: string;
  lat: number | null;
  lng: number | null;
  quartier_count: number;
}

export interface BdGeoQuartier {
  id: number;
  name: string;
  lat?: number | null;
  lng?: number | null;
}

const GEO_STALE = 30 * 60_000;

export function countriesQuery() {
  return queryOptions({
    queryKey: ['geo', 'countries'],
    queryFn: async () => (await apiFetch<{ countries: BdCountry[] }>('/geo/countries')).countries,
    staleTime: GEO_STALE,
  });
}

export function citiesQuery(iso2: string | null | undefined) {
  return queryOptions({
    queryKey: ['geo', 'cities', iso2],
    queryFn: async () =>
      (await apiFetch<{ cities: BdCity[] }>(`/geo/countries/${encodeURIComponent(iso2!)}/cities`)).cities,
    enabled: !!iso2,
    staleTime: GEO_STALE,
  });
}

export function cityQuartiersQuery(cityId: number | null | undefined) {
  return queryOptions({
    queryKey: ['geo', 'quartiers', cityId],
    queryFn: async () =>
      (await apiFetch<{ quartiers: BdGeoQuartier[] }>(`/geo/cities/${cityId}/quartiers`)).quartiers,
    enabled: cityId != null,
    staleTime: GEO_STALE,
  });
}

/**
 * Enabled countries plus the default one (from /geo/countries, else
 * /app-config `default_country`). `single` hides the country step.
 */
export function useCountries() {
  const countries = useQuery(countriesQuery());
  const config = useQuery(appConfigQuery());
  const list = countries.data ?? [];
  const defaultIso2 =
    list.find((c) => c.is_default)?.iso2 ?? config.data?.default_country?.iso2 ?? list[0]?.iso2 ?? 'GA';
  return {
    countries: list,
    defaultIso2,
    single: list.length <= 1,
    isLoading: countries.isLoading,
    isError: countries.isError,
    refetch: countries.refetch,
  };
}

/**
 * The enabled city with this name (accent/case-insensitive) and its country.
 * Looks in the default country first, then the other enabled ones.
 * `/auth/me` has no `country_iso2` yet, so the country is found by the name.
 */
export function useResolvedCity(cityName: string | null | undefined) {
  const { countries, defaultIso2 } = useCountries();
  const isoList = [defaultIso2, ...countries.map((c) => c.iso2).filter((i) => i !== defaultIso2)];
  const results = useQueries({
    queries: isoList.map((iso) => ({ ...citiesQuery(iso), enabled: !!cityName && !!iso })),
  });
  for (let i = 0; i < isoList.length; i++) {
    const hit = results[i]?.data?.find((c) => sameName(c.name, cityName));
    if (hit) return { city: hit, countryIso2: isoList[i], isLoading: false };
  }
  return { city: null, countryIso2: null, isLoading: !!cityName && results.some((r) => r.isLoading) };
}

/**
 * Quartiers of a city given by name: the geo list when the city is a known
 * enabled city, else the legacy `/quartiers?city=` list. Same shape for both.
 */
export function useCityQuartiers(cityName: string | null | undefined, enabled = true) {
  const resolved = useResolvedCity(enabled ? cityName : null);
  const geo = useQuery({ ...cityQuartiersQuery(resolved.city?.id), enabled: enabled && !!resolved.city });
  const useLegacy = enabled && !!cityName && !resolved.isLoading && !resolved.city;
  const legacy = useQuery({ ...quartiersQuery(cityName), enabled: useLegacy });
  if (useLegacy) {
    return {
      quartiers: (legacy.data?.quartiers ?? []).map((q) => ({ id: q.id, name: q.name })) as BdGeoQuartier[],
      isLoading: legacy.isLoading,
      isError: legacy.isError,
      refetch: legacy.refetch,
    };
  }
  return {
    quartiers: geo.data ?? [],
    isLoading: resolved.isLoading || (!!resolved.city && geo.isLoading),
    isError: geo.isError,
    refetch: geo.refetch,
  };
}

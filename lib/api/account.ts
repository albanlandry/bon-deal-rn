/** Account self-service: preferences, legal consent, export, deletion, public profiles. */
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { getApiUrl } from '@/utils/config';
import type { BdPreferences, BdPublicProfile } from '@/constants/types';

export type LegalDocument = 'terms' | 'privacy';

export function preferencesQuery() {
  return queryOptions({
    queryKey: ['me', 'preferences'],
    queryFn: async () => {
      const res = await apiFetch<BdPreferences & { success: boolean }>('/auth/me/preferences');
      return { notifications: res.notifications, privacy: res.privacy } as BdPreferences;
    },
    staleTime: 0,
  });
}

export interface PreferencesPatch {
  notifications?: Partial<BdPreferences['notifications']>;
  privacy?: Partial<BdPreferences['privacy']>;
}

/** PUT /auth/me/preferences — partial; returns the merged result. */
export async function updatePreferences(patch: PreferencesPatch): Promise<BdPreferences> {
  const res = await apiFetch<BdPreferences & { success: boolean }>('/auth/me/preferences', {
    method: 'PUT',
    body: patch,
  });
  return { notifications: res.notifications, privacy: res.privacy };
}

/** Accept the CURRENT version of the legal documents (default: both). */
export async function acceptConsents(documents?: LegalDocument[]): Promise<LegalDocument[]> {
  const res = await apiFetch<{ consent_required: LegalDocument[] }>('/auth/me/consents', {
    method: 'POST',
    body: documents ? { documents } : {},
  });
  return res.consent_required ?? [];
}

/** Public, current legal versions (GET /legal, no auth). */
/** Server limits the app needs up front (public GET /app-config). */
export { appConfigQuery } from './appConfig';

export function legalVersionsQuery() {
  return queryOptions({
    queryKey: ['legal'],
    queryFn: () => apiFetch<{ terms_version: string; privacy_version: string }>('/legal'),
    staleTime: 60 * 60_000,
  });
}

/** A 10-minute download URL for the caller's data (open it in a browser). */
export async function createExportUrl(): Promise<string> {
  const res = await apiFetch<{ path: string; expires_in: number }>('/auth/me/export-link', {
    method: 'POST',
  });
  return getApiUrl(res.path);
}

/** DELETE /auth/me — anonymises the account; the token stops working. */
export async function deleteAccount(): Promise<void> {
  await apiFetch('/auth/me', { method: 'DELETE', body: { confirm: 'SUPPRIMER' } });
}

export function publicProfileQuery(userId: number | null | undefined) {
  return queryOptions({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const res = await apiFetch<{ user: BdPublicProfile }>(`/users/${userId}/profile`);
      return res.user;
    },
    enabled: !!userId && userId > 0,
    staleTime: 60_000,
  });
}

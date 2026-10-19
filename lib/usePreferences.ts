/**
 * Server-backed notification & privacy preferences (GET/PUT
 * /auth/me/preferences). Each switch is optimistic (Doherty) and rolls back
 * with a toast if the save fails.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { showToast } from '@/components/ui';
import { preferencesQuery, PreferencesPatch, updatePreferences } from '@/lib/api/account';
import type { BdPreferences } from '@/constants/types';

// Device-only stores used before the API existed; dropped once.
const LEGACY_KEYS = [
  'bondeal.settings.notifications.v1',
  'bondeal.settings.privacy.v1',
  'bondeal.settings.consents.v1',
];

export function usePreferences() {
  const qc = useQueryClient();
  const q = useQuery(preferencesQuery());
  const key = preferencesQuery().queryKey;

  useEffect(() => {
    AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});
  }, []);

  const mut = useMutation({
    mutationFn: (patch: PreferencesPatch) => updatePreferences(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BdPreferences>(key);
      if (prev) {
        qc.setQueryData<BdPreferences>(key, {
          notifications: { ...prev.notifications, ...patch.notifications },
          privacy: { ...prev.privacy, ...patch.privacy },
        });
      }
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      showToast.error('Réglage non enregistré', 'Vérifiez votre connexion et réessayez.');
    },
    onSuccess: (next) => qc.setQueryData(key, next),
  });

  return {
    prefs: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    refetch: q.refetch,
    setNotification: (k: keyof BdPreferences['notifications'], v: boolean) =>
      mut.mutate({ notifications: { [k]: v } }),
    setPrivacy: (k: keyof BdPreferences['privacy'], v: boolean) => mut.mutate({ privacy: { [k]: v } }),
  };
}

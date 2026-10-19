import { ApiError, apiErrorMessage } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

/**
 * PATCH /auth/me with a city answers 400 when the city is unknown or no
 * longer enabled. Refresh the geo lists (the city may have just been
 * disabled) and return the message to show.
 */
export function locationSaveErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 400) {
    queryClient.invalidateQueries({ queryKey: ['geo'] });
    return apiErrorMessage(e, 'Cette ville n’est pas disponible sur BonDeal. Choisissez-en une autre.');
  }
  if (e instanceof ApiError && e.status === 401) return 'Session expirée. Reconnectez-vous.';
  return apiErrorMessage(e, 'Impossible d’enregistrer votre ville. Réessayez.');
}

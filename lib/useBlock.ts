/**
 * Block / unblock with a confirm dialog that states the exact effects
 * (Norman: consequences before commitment). Refreshes every cache a block
 * changes: the profile, the blocked list, feeds (blocked sellers' listings
 * disappear) and conversations.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { showToast } from '@/components/ui';
import { blockUser, unblockUser } from '@/lib/api/safety';
import { haptics } from '@/lib/haptics';

export const BLOCK_EFFECTS =
  'Vous ne verrez plus ses annonces. Ni vous ni cette personne ne pourrez vous écrire ou faire une offre. ' +
  'Elle n’est pas prévenue. Vous pourrez la débloquer dans Paramètres › Confidentialité.';

export function useBlockActions() {
  const qc = useQueryClient();

  const refresh = (userId: number) => {
    qc.invalidateQueries({ queryKey: ['profile', userId] });
    qc.invalidateQueries({ queryKey: ['blocks'] });
    qc.invalidateQueries({ queryKey: ['posts'] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
  };

  const block = useMutation({
    mutationFn: ({ userId }: { userId: number; name?: string | null }) => blockUser(userId),
    onSuccess: (_d, { userId, name }) => {
      haptics.success();
      showToast.success(`${name ?? 'Ce membre'} est bloqué`);
      refresh(userId);
    },
    onError: (e: any) => showToast.error('Blocage impossible', e?.message || 'Réessayez.'),
  });

  const unblock = useMutation({
    mutationFn: ({ userId }: { userId: number; name?: string | null }) => unblockUser(userId),
    onSuccess: (_d, { userId, name }) => {
      showToast.success(`${name ?? 'Ce membre'} est débloqué`);
      refresh(userId);
    },
    onError: (e: any) => showToast.error('Déblocage impossible', e?.message || 'Réessayez.'),
  });

  const confirmBlock = (userId: number, name?: string | null, onDone?: () => void) => {
    Alert.alert(`Bloquer ${name ?? 'ce membre'} ?`, BLOCK_EFFECTS, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Bloquer',
        style: 'destructive',
        onPress: () => block.mutate({ userId, name }, { onSuccess: () => onDone?.() }),
      },
    ]);
  };

  const confirmUnblock = (userId: number, name?: string | null) => {
    Alert.alert(
      `Débloquer ${name ?? 'ce membre'} ?`,
      'Vous verrez de nouveau ses annonces et vous pourrez à nouveau échanger des messages.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Débloquer', onPress: () => unblock.mutate({ userId, name }) },
      ],
    );
  };

  return { confirmBlock, confirmUnblock, busy: block.isPending || unblock.isPending };
}

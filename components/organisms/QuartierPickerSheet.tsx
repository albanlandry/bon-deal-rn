import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateMe } from '@/lib/api/me';
import { locationSaveErrorMessage } from '@/lib/locationErrors';
import { sameName } from '@/lib/textSearch';
import { showToast } from '../atoms/Toast';
import LocationPickerSheet, { LocationChoice } from './LocationPickerSheet';

export interface QuartierPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Home location picker (MB-DSC-03): the user's city and quartier from /geo,
 * saved with PATCH /auth/me { city, quartier }. Opens on the quartier list of
 * the current city; "Changer de ville" goes back to the cities.
 */
export default function QuartierPickerSheet({ visible, onClose }: QuartierPickerSheetProps) {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();

  const save = async ({ city, quartier }: LocationChoice) => {
    const cityChanged = !sameName(city, user?.city);
    if (!cityChanged && (quartier ?? null) === (user?.quartier ?? null)) {
      onClose();
      return;
    }
    try {
      await updateMe(cityChanged ? { city, quartier } : { quartier });
    } catch (e) {
      showToast.error('Échec', locationSaveErrorMessage(e));
      throw e;
    }
    await refreshUser();
    // The feed is scoped server-side to the user's city.
    if (cityChanged) qc.invalidateQueries({ queryKey: ['posts'] });
    showToast.success(
      cityChanged ? 'Ville mise à jour' : 'Quartier mis à jour',
      quartier ? `${quartier}, ${city}` : city,
    );
    onClose();
  };

  return (
    <LocationPickerSheet
      visible={visible}
      onClose={onClose}
      city={user?.city}
      quartier={user?.quartier}
      initialStep={user?.city ? 'quartier' : 'city'}
      onConfirm={save}
    />
  );
}

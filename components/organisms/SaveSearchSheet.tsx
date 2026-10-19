/**
 * "Enregistrer cette recherche": name + alerts switch (default ON, the
 * reason a user saves a search), then POST /saved-searches.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BdSavedSearchFilters } from '@/constants/types';
import { createSavedSearch, savedSearchErrorMessage } from '@/lib/api/savedSearches';
import { haptics } from '@/lib/haptics';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import ListRow from '../molecules/ListRow';
import Sheet from './Sheet';
import { track } from '@/lib/analytics';

export interface SaveSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: BdSavedSearchFilters;
  defaultName: string;
  /** Short French summary of the filters, shown under the name. */
  summary?: string;
}

export default function SaveSearchSheet({ visible, onClose, filters, defaultName, summary }: SaveSearchSheetProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(defaultName);
  const [alerts, setAlerts] = useState(true);

  useEffect(() => {
    if (visible) {
      setName(defaultName.slice(0, 80));
      setAlerts(true);
    }
  }, [visible, defaultName]);

  const save = useMutation({
    mutationFn: () => createSavedSearch({ name, filters, alertsEnabled: alerts }),
    onSuccess: () => {
      haptics.success();
      track('save_search', { count: Object.keys(filters ?? {}).length, state: alerts ? 'alerts_on' : 'alerts_off' });
      qc.invalidateQueries({ queryKey: ['saved-searches'] });
      onClose();
      showToast.success(
        'Recherche enregistrée',
        alerts ? 'Vous serez prévenu des nouvelles annonces.' : 'Retrouvez-la dans « Mes recherches ».',
      );
    },
    onError: (e) => showToast.error('Échec', savedSearchErrorMessage(e)),
  });

  const trimmed = name.trim();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Enregistrer cette recherche"
      footer={
        <View style={styles.actions}>
          <Button
            label="Enregistrer"
            icon="bookmark-outline"
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!trimmed}
            disabledReason="Donnez un nom à cette recherche."
            fullWidth
          />
          <Button
            label="Voir mes recherches"
            variant="ghost"
            onPress={() => {
              onClose();
              router.push('/saved-searches' as Href);
            }}
            fullWidth
          />
        </View>
      }>
      <TextField
        label="Nom"
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder="Ex : Frigo pas cher"
        autoFocus
        returnKeyType="done"
      />
      {!!summary && (
        <AppText variant="caption" color="inkMuted" style={styles.summary}>
          {summary}
        </AppText>
      )}
      <View style={styles.toggle}>
        <ListRow
          icon="notifications-outline"
          title="Alertes"
          subtitle="Une notification quand de nouvelles annonces correspondent"
          toggle={{ value: alerts, onChange: setAlerts }}
          last
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 4 },
  summary: { marginTop: 4 },
  toggle: { marginTop: 12, marginHorizontal: -16 },
});

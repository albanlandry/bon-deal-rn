import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { useAuth } from '@/contexts/AuthContext';
import { quartiersQuery } from '@/lib/api/quartiers';
import { updateMe } from '@/lib/api/me';
import { haptics } from '@/lib/haptics';
import AppText from '../atoms/AppText';
import Skeleton from '../atoms/Skeleton';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import { ErrorState } from '../molecules/EmptyState';
import Sheet from './Sheet';

export interface QuartierPickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Home quartier picker (MB-DSC-03): GET /quartiers?city=… then
 * PATCH /auth/me { quartier }. Most-used quartiers first (backend order).
 */
export default function QuartierPickerSheet({ visible, onClose }: QuartierPickerSheetProps) {
  const t = useTheme();
  const { user, refreshUser } = useAuth();
  const [filter, setFilter] = useState('');
  const q = useQuery({ ...quartiersQuery(user?.city), enabled: visible && !!user?.city });

  const save = useMutation({
    mutationFn: (quartier: string) => updateMe({ quartier }),
    onSuccess: async (_d, quartier) => {
      haptics.success();
      await refreshUser();
      showToast.success('Quartier mis à jour', quartier);
      onClose();
    },
    onError: (e: any) => showToast.error('Échec', e?.message || 'Veuillez réessayer.'),
  });

  const list = useMemo(() => {
    const all = q.data?.quartiers ?? [];
    const f = filter.trim().toLowerCase();
    return f ? all.filter((x) => x.name.toLowerCase().includes(f)) : all;
  }, [q.data, filter]);

  return (
    <Sheet visible={visible} onClose={onClose} title={user?.city ? `Quartier à ${user.city}` : 'Quartier'}>
      {!user?.city ? (
        <AppText variant="small" color="inkMuted">
          Renseignez d’abord votre ville dans votre profil.
        </AppText>
      ) : (
        <>
          <TextField
            placeholder="Rechercher un quartier"
            value={filter}
            onChangeText={setFilter}
            left={<Ionicons name="search" size={18} color={t.colors.inkSubtle} />}
            autoCorrect={false}
          />
          {q.isLoading ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={44} />
              ))}
            </View>
          ) : q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : list.length === 0 ? (
            <AppText variant="small" color="inkMuted" style={{ paddingVertical: 16 }}>
              Aucun quartier trouvé.
            </AppText>
          ) : (
            list.map((x) => {
              const selected = x.name === user?.quartier;
              return (
                <Pressable
                  key={x.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, busy: save.isPending }}
                  disabled={save.isPending}
                  onPress={() => (selected ? onClose() : save.mutate(x.name))}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: t.colors.line },
                    pressed && { backgroundColor: t.colors.surfaceAlt },
                  ]}>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? t.colors.brandStrong : t.colors.inkSubtle}
                  />
                  <AppText variant="body" style={styles.flex}>
                    {x.name}
                  </AppText>
                  {save.isPending && save.variables === x.name && (
                    <AppText variant="caption" color="inkMuted">
                      Enregistrement…
                    </AppText>
                  )}
                </Pressable>
              );
            })
          )}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
});

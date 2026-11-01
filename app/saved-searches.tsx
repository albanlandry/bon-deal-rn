// app/saved-searches.tsx — Mes recherches (MB-DSC saved searches + alerts).
// Tap to replay, switch alerts (optimistic), rename, delete optimistically
// with an "Annuler" toast (Doherty: undo instead of a confirm dialog).
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import CategoryTag from '@/components/molecules/CategoryTag';
import SpringSwitch from '@/components/molecules/SpringSwitch';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  PressableScale,
  ScreenHeader,
  Sheet,
  showToast,
  Skeleton,
  TextField,
} from '@/components/ui';
import { categoryLabel } from '@/constants/catalog';
import type { BdSavedSearch } from '@/constants/types';
import {
  deleteSavedSearch,
  describeFilters,
  filtersToRouteParams,
  savedSearchErrorMessage,
  savedSearchesQuery,
  updateSavedSearch,
} from '@/lib/api/savedSearches';
import { formatRelativeTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

const KEY = ['saved-searches'];
/** The delete is sent once the undo toast (5 s) has gone. */
const UNDO_MS = 5000;

export default function SavedSearchesScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery(savedSearchesQuery());
  // Rows deleted but still undoable: hidden here, the request waits for the toast.
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const list = (q.data ?? []).filter((x) => !hidden.has(x.id));
  const pending = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const unhide = (id: number) =>
    setHidden((h) => {
      const next = new Set(h);
      next.delete(id);
      return next;
    });
  const [renaming, setRenaming] = useState<BdSavedSearch | null>(null);
  const [newName, setNewName] = useState('');

  const patchLocal = (id: number, patch: Partial<BdSavedSearch>) =>
    qc.setQueryData<BdSavedSearch[]>(KEY, (old) => old?.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const alertsMut = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) => updateSavedSearch(id, { alerts_enabled: value }),
    onMutate: ({ id, value }) => {
      haptics.selection();
      patchLocal(id, { alerts_enabled: value });
    },
    onError: (e, { id, value }) => {
      patchLocal(id, { alerts_enabled: !value });
      showToast.error('Échec', savedSearchErrorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateSavedSearch(id, { name: name.trim() }),
    onSuccess: (row) => {
      patchLocal(row.id, { name: row.name });
      setRenaming(null);
      showToast.success('Recherche renommée');
    },
    onError: (e) => showToast.error('Échec', savedSearchErrorMessage(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSavedSearch(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<BdSavedSearch[]>(KEY, (old) => old?.filter((x) => x.id !== id));
      unhide(id);
    },
    onError: (e, id) => {
      unhide(id);
      showToast.error('Échec', savedSearchErrorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const removeWithUndo = (s: BdSavedSearch) => {
    haptics.selection();
    setHidden((h) => new Set(h).add(s.id));
    const timer = setTimeout(() => {
      pending.current.delete(s.id);
      deleteMut.mutate(s.id);
    }, UNDO_MS);
    pending.current.set(s.id, timer);
    showToast.undo('Recherche supprimée', () => {
      clearTimeout(timer);
      pending.current.delete(s.id);
      unhide(s.id);
    }, `« ${s.name} » et ses alertes.`);
  };

  // Leaving the screen commits the deletes still waiting on their toast.
  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach((timer, id) => {
        clearTimeout(timer);
        deleteSavedSearch(id)
          .catch(() => {})
          .finally(() => qc.invalidateQueries({ queryKey: KEY }));
      });
      timers.clear();
    };
  }, [qc]);

  const open = (s: BdSavedSearch) =>
    router.push({ pathname: '/search-results', params: filtersToRouteParams(s.filters) });

  const startRename = (s: BdSavedSearch) => {
    setNewName(s.name);
    setRenaming(s);
  };

  const renderItem = ({ item }: { item: BdSavedSearch }) => (
    <Card style={styles.card}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la recherche ${item.name}`}
        onPress={() => open(item)}
        style={styles.main}>
        {item.filters?.categories?.length === 1 ? (
          // Category mnemonic: same icon + hue as everywhere else (docs/09 §5).
          <CategoryTag value={item.filters.categories[0]} iconOnly size={40} />
        ) : (
          <View style={[styles.icon, { backgroundColor: t.colors.brandTint, borderRadius: t.radius.sm }]}>
            <Ionicons name="search" size={20} color={t.colors.brandStrong} />
          </View>
        )}
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="caption" color="inkMuted" numberOfLines={2}>
            {describeFilters(item.filters, categoryLabel)}
          </AppText>
          {!!item.created_at && (
            <AppText variant="caption" color="inkSubtle">
              Enregistrée {formatRelativeTime(item.created_at).toLowerCase()}
            </AppText>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
      </PressableScale>
      <View style={[styles.actions, { borderTopColor: t.colors.line }]}>
        {/* One switch announcement: the label names the search, the state
            comes from `checked`; the visible text and the thumb are hidden. */}
        <PressableScale
          accessibilityRole="switch"
          accessibilityState={{ checked: item.alerts_enabled }}
          accessibilityLabel={`Alertes pour ${item.name}`}
          haptic={false}
          scaleTo={0.98}
          onPress={() => alertsMut.mutate({ id: item.id, value: !item.alerts_enabled })}
          style={styles.alerts}>
          <Ionicons
            name={item.alerts_enabled ? 'notifications' : 'notifications-off-outline'}
            size={18}
            color={item.alerts_enabled ? t.colors.brandStrong : t.colors.inkMuted}
          />
          <AppText
            variant="label"
            color={item.alerts_enabled ? 'ink' : 'inkMuted'}
            style={styles.flex}
            importantForAccessibility="no"
            accessibilityElementsHidden>
            {item.alerts_enabled ? 'Alertes activées' : 'Alertes désactivées'}
          </AppText>
          <SpringSwitch value={item.alerts_enabled} />
        </PressableScale>
        <IconButton icon="create-outline" label={`Renommer ${item.name}`} size={20} onPress={() => startRename(item)} />
        <IconButton
          icon="trash-outline"
          label={`Supprimer ${item.name}`}
          color="danger"
          size={20}
          onPress={() => removeWithUndo(item)}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader
        large
        title="Mes recherches"
        subtitle={q.data ? `${list.length} recherche${list.length > 1 ? 's' : ''} sur 20` : undefined}
      />
      {q.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={t.radius.md} />
          ))}
        </View>
      ) : q.isError ? (
        <ErrorState message="Impossible de charger vos recherches." onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(x) => String(x.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, list.length === 0 && styles.grow]}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
              colors={[t.colors.brandStrong]}
              tintColor={t.colors.brandStrong}
            />
          }
          ListHeaderComponent={
            list.length > 0 ? (
              <AppText variant="caption" color="inkMuted">
                Avec les alertes, nous vous prévenons quand de nouvelles annonces correspondent (au plus une
                notification par recherche tous les quarts d’heure).
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="Aucune recherche enregistrée"
              message="Lancez une recherche, puis touchez « Enregistrer » sur les résultats : nous vous préviendrons des nouvelles annonces."
              actionLabel="Rechercher"
              onAction={() => router.push('/search')}
            />
          }
        />
      )}

      <Sheet
        visible={!!renaming}
        onClose={() => setRenaming(null)}
        title="Renommer la recherche"
        footer={
          <Button
            label="Enregistrer"
            onPress={() => renaming && renameMut.mutate({ id: renaming.id, name: newName })}
            loading={renameMut.isPending}
            disabled={!newName.trim()}
            disabledReason="Le nom ne peut pas être vide."
            fullWidth
          />
        }>
        <TextField label="Nom" value={newName} onChangeText={setNewName} maxLength={80} autoFocus />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  grow: { flexGrow: 1 },
  card: { paddingBottom: 4 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  alerts: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  flex: { flex: 1 },
});

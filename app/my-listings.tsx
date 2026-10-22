// app/my-listings.tsx — the seller's own listings.
//
// State filter chips with real counts (Hick: one dimension, ≤ 6 options);
// familiar 2-column ListingCard grid (Jakob) with labelled actions under each
// card ("Vendu", "Modifier"); delete lives in an overflow sheet, away from the
// common action, and keeps a confirm that states the exact consequence
// (Norman, ethics §2). "Vendu" is optimistic with an undo toast (Doherty)
// because it is reversible, and gets a short celebration (peak–end).
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AppText,
  Button,
  Celebrate,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  ListingCard,
  ListingCardSkeleton,
  ListRow,
  ScreenHeader,
  Sheet,
  showToast,
} from '@/components/ui';
import { ApiError } from '@/lib/api';
import { myPostsQuery, deletePost, renewPost, updatePost } from '@/lib/api/posts';
import { haptics } from '@/lib/haptics';
import { createStyles, Theme, useStyles, useTheme } from '@/theme';
import type { BdPost, BdPostListResponse } from '@/constants/types';

type FilterType = 'all' | 'published' | 'reserved' | 'sold' | 'expired' | 'draft' | 'unpublished';

const FILTERS: { id: FilterType; label: string; states: string[] }[] = [
  { id: 'all', label: 'Toutes', states: [] },
  { id: 'published', label: 'En ligne', states: ['published'] },
  { id: 'reserved', label: 'Réservées', states: ['reserved'] },
  { id: 'sold', label: 'Vendues', states: ['sold'] },
  { id: 'expired', label: 'Expirées', states: ['expired'] },
  { id: 'draft', label: 'Brouillons', states: ['draft'] },
  { id: 'unpublished', label: 'Masquées', states: ['unpublished'] },
];

const MINE_KEY = ['posts', 'mine', null] as const;
const GAP = 12;
const PAD = 16;

/** Whole days until `iso` (negative once past), or null. */
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  // Server timestamps are naive UTC.
  const then = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`).getTime();
  if (Number.isNaN(then)) return null;
  return Math.ceil((then - Date.now()) / 86_400_000);
}

function expiryLabel(days: number): string {
  if (days <= 0) return 'Expire aujourd’hui';
  if (days === 1) return 'Expire demain';
  return `Expire dans ${days} jours`;
}

/** Renewal is offered for expired listings and published ones close to expiry. */
const RENEW_WINDOW_DAYS = 3;

function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status >= 500) return 'Erreur serveur. Réessayez.';
    return e.message;
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function MyListingsScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const cardWidth = (width - PAD * 2 - GAP) / 2;
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [menuPost, setMenuPost] = useState<BdPost | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  const listing = useQuery(myPostsQuery());
  const posts = listing.data?.posts ?? [];

  const activeStates = FILTERS.find((f) => f.id === selectedFilter)?.states ?? [];
  const filteredPosts = useMemo(
    () => (activeStates.length === 0 ? posts : posts.filter((p) => activeStates.includes(p.state))),
    [posts, activeStates],
  );

  // Real counts per chip, derived from the loaded list.
  const countFor = (states: string[]) =>
    states.length === 0 ? posts.length : posts.filter((p) => states.includes(p.state)).length;
  const visibleFilters = FILTERS.filter(
    (f) => f.id === 'all' || f.id === selectedFilter || countFor(f.states) > 0 || f.id === 'published',
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const setLocalState = (id: number, state: string) => {
    queryClient.setQueryData<BdPostListResponse>(MINE_KEY, (old) =>
      old ? { ...old, posts: old.posts.map((p) => (p.id === id ? { ...p, state } : p)) } : old,
    );
  };

  const delMut = useMutation({
    mutationFn: (post: BdPost) => deletePost(post.id),
    onSuccess: () => {
      invalidate();
      showToast.success('Annonce supprimée');
    },
    onError: (e, post) => {
      // 409: the listing has a transaction — it must stay for the other party.
      if (e instanceof ApiError && (e.code === 'post_has_transactions' || (e.status === 409 && !e.code))) {
        Alert.alert(
          'Suppression impossible',
          `« ${post.title} » est liée à une vente (transaction en cours ou passée) : elle doit rester consultable par l’autre partie. Vous pouvez la masquer pour qu’elle n’apparaisse plus dans les recherches.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Masquer l’annonce',
              onPress: () => stateMut.mutate({ id: post.id, state: 'unpublished', prev: post.state }),
            },
          ],
        );
        return;
      }
      showToast.error('Échec', errMessage(e));
    },
  });

  const renewMut = useMutation({
    mutationFn: (id: number) => renewPost(id),
    onSuccess: () => {
      haptics.success();
      invalidate();
      showToast.success('Annonce renouvelée', 'Elle est de nouveau en ligne pour une période complète.');
    },
    onError: (e) =>
      showToast.error(
        'Échec',
        e instanceof ApiError && (e.code === 'post_not_renewable' || (e.status === 409 && !e.code))
          ? 'Seules les annonces en ligne ou expirées peuvent être renouvelées.'
          : errMessage(e),
      ),
  });

  const stateMut = useMutation({
    mutationFn: ({ id, state }: { id: number; state: string; prev: string }) => updatePost(id, { state }),
    onMutate: ({ id, state }) => setLocalState(id, state),
    onError: (e, { id, prev }) => {
      setLocalState(id, prev);
      showToast.error('Échec', errMessage(e));
    },
    onSettled: () => invalidate(),
  });

  const handleEdit = (id: number) => {
    router.push({ pathname: '/post-item', params: { id: String(id), mode: 'edit' } });
  };

  const handleDelete = (post: BdPost) => {
    Alert.alert(
      'Supprimer l’annonce ?',
      `« ${post.title} » sera définitivement supprimée, avec ses photos. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => delMut.mutate(post) },
      ],
    );
  };

  const handleMarkAsSold = (post: BdPost) => {
    const prev = post.state;
    haptics.success();
    setCelebrate(Date.now()); // never blocks touches; the undo toast stays usable
    stateMut.mutate({ id: post.id, state: 'sold', prev });
    showToast.undo('Marquée comme vendue', () =>
      stateMut.mutate({ id: post.id, state: prev, prev: 'sold' }),
    );
  };

  const busy = delMut.isPending || renewMut.isPending;

  const renderItem = ({ item }: { item: BdPost }) => {
    const days = item.state === 'published' ? daysUntil(item.expires_at) : null;
    const canRenew =
      item.state === 'expired' || (days != null && days <= RENEW_WINDOW_DAYS);
    return (
    <View style={{ width: cardWidth }}>
      <ListingCard
        post={item}
        width={cardWidth}
        showState
        onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
      />
      <View style={styles.stats} accessibilityLabel={`${item.views_count} vues, ${item.likes_count} favoris`}>
        <Ionicons name="eye-outline" size={14} color={t.colors.inkMuted} />
        <AppText variant="caption" color="inkMuted">
          {item.views_count}
        </AppText>
        <Ionicons name="heart-outline" size={14} color={t.colors.inkMuted} style={styles.statGap} />
        <AppText variant="caption" color="inkMuted">
          {item.likes_count}
        </AppText>
        {item.active_offer_count > 0 && (
          <>
            <Ionicons name="pricetag-outline" size={14} color={t.colors.brandStrong} style={styles.statGap} />
            <AppText variant="caption" color="brandStrong">
              {item.active_offer_count} offre{item.active_offer_count > 1 ? 's' : ''}
            </AppText>
          </>
        )}
      </View>
      {item.state === 'expired' ? (
        <View style={styles.expiry}>
          <Ionicons name="alert-circle-outline" size={14} color={t.colors.danger} />
          <AppText variant="caption" color="danger">
            Expirée · plus visible
          </AppText>
        </View>
      ) : days != null ? (
        <View style={styles.expiry}>
          <Ionicons
            name="time-outline"
            size={14}
            color={days <= RENEW_WINDOW_DAYS ? t.colors.warning : t.colors.inkMuted}
          />
          <AppText variant="caption" color={days <= RENEW_WINDOW_DAYS ? 'warning' : 'inkMuted'}>
            {expiryLabel(days)}
          </AppText>
        </View>
      ) : null}
      {canRenew && (
        <Button
          label="Renouveler"
          icon="refresh-outline"
          size="sm"
          variant={item.state === 'expired' ? 'primary' : 'secondary'}
          onPress={() => renewMut.mutate(item.id)}
          loading={renewMut.isPending && renewMut.variables === item.id}
          disabled={busy}
          style={styles.renew}
        />
      )}
      {(item.state === 'published' || item.state === 'reserved') && (
        <Button
          label="Vendu"
          icon="checkmark-done-outline"
          size="sm"
          variant="secondary"
          onPress={() => handleMarkAsSold(item)}
          disabled={busy}
          accessibilityHint={`Marque « ${item.title} » comme vendue`}
          style={styles.sold}
        />
      )}
      <View style={styles.actions}>
        <Button
          label="Modifier"
          icon="create-outline"
          size="sm"
          variant="ghost"
          onPress={() => handleEdit(item.id)}
          disabled={busy}
          accessibilityHint={`Ouvre « ${item.title} » en modification`}
          style={styles.flex}
        />
        <IconButton
          icon="ellipsis-horizontal"
          label={`Plus d’actions pour « ${item.title} »`}
          size={20}
          onPress={() => setMenuPost(item)}
          disabled={busy}
        />
      </View>
    </View>
    );
  };

  const filterLabel = FILTERS.find((f) => f.id === selectedFilter)?.label ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        large
        title="Mes annonces"
        subtitle={listing.data ? `${posts.length} annonce${posts.length > 1 ? 's' : ''}` : undefined}
        right={
          <Button
            label="Éclair"
            icon="flash-outline"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/boutique-eclair')}
            accessibilityHint="Créer plusieurs brouillons à partir de photos"
          />
        }
      />

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          {visibleFilters.map((f) => {
            const n = countFor(f.states);
            return (
              <Chip
                key={f.id}
                kind="choice"
                label={listing.data ? `${f.label} · ${n}` : f.label}
                selected={selectedFilter === f.id}
                onPress={() => setSelectedFilter(f.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      {listing.isLoading ? (
        <View style={[styles.grid, styles.skeletonGrid]}>
          {[0, 1, 2, 3].map((i) => (
            <ListingCardSkeleton key={i} width={cardWidth} />
          ))}
        </View>
      ) : listing.isError ? (
        <ErrorState message="Impossible de charger vos annonces." onRetry={() => listing.refetch()} />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.grid, filteredPosts.length === 0 && styles.emptyGrow]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={listing.isRefetching}
              onRefresh={() => listing.refetch()}
              colors={[t.colors.brandStrong]}
              tintColor={t.colors.brandStrong}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={selectedFilter === 'all' ? 'storefront-outline' : 'file-tray-outline'}
              title={selectedFilter === 'all' ? 'Pas encore d’annonce' : `Aucune annonce « ${filterLabel} »`}
              message={
                selectedFilter === 'all'
                  ? 'Une photo suffit pour commencer : l’IA rédige l’annonce avec vous.'
                  : 'Changez de filtre ou publiez un nouvel article.'
              }
              actionLabel="Vendre un article"
              onAction={() => router.push('/post-item')}
              secondaryLabel={selectedFilter !== 'all' ? 'Voir toutes mes annonces' : undefined}
              onSecondary={selectedFilter !== 'all' ? () => setSelectedFilter('all') : undefined}
            />
          }
        />
      )}

      <Sheet visible={!!menuPost} onClose={() => setMenuPost(null)} title={menuPost?.title ?? 'Annonce'}>
        <ListRow
          icon="eye-outline"
          title="Voir l’annonce"
          onPress={() => {
            const p = menuPost;
            setMenuPost(null);
            if (p) router.push({ pathname: '/item-details', params: { id: String(p.id) } });
          }}
        />
        <ListRow
          icon="trash-outline"
          title="Supprimer l’annonce"
          subtitle="Définitif, avec ses photos"
          destructive
          onPress={() => {
            const p = menuPost;
            setMenuPost(null);
            if (p) handleDelete(p);
          }}
          last
        />
      </Sheet>

      <Celebrate trigger={celebrate} haptic={false} onDone={() => setCelebrate(0)} />
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  filters: { gap: t.spacing.xs, paddingHorizontal: PAD, paddingVertical: t.spacing.xs },
  grid: { paddingHorizontal: PAD, paddingTop: t.spacing.xs, paddingBottom: t.spacing.xxl },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  row: { gap: GAP, marginBottom: t.spacing.md },
  emptyGrow: { flexGrow: 1 },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 4 },
  statGap: { marginLeft: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 4 },
  renew: { marginTop: 8 },
  sold: { marginTop: 8 },
}));


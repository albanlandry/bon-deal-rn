// app/transactions.tsx — Mes transactions (MB-TRD-04/05): every deal born
// from an accepted offer, as buyer or seller, with the next step inline
// (confirm, cancel, review, dispute). Pending first: they need action.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip, EmptyState, ErrorState, ScreenHeader, Skeleton } from '@/components/ui';
import TransactionPanel from '@/components/organisms/TransactionPanel';
import { useAuth } from '@/contexts/AuthContext';
import { transactionsQuery } from '@/lib/api/transactions';
import { useTheme } from '@/theme';

type Filter = 'all' | 'pending' | 'completed' | 'closed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'En cours' },
  { id: 'completed', label: 'Conclues' },
  { id: 'closed', label: 'Annulées / litiges' },
];

const ORDER: Record<string, number> = { pending: 0, disputed: 1, completed: 2, cancelled: 3 };

export default function TransactionsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const q = useQuery(transactionsQuery());
  const [filter, setFilter] = useState<Filter>('all');

  const all = q.data ?? [];
  const list = useMemo(() => {
    const rows = all.filter((x) =>
      filter === 'all'
        ? true
        : filter === 'closed'
          ? x.status === 'cancelled' || x.status === 'disputed'
          : x.status === filter,
    );
    return [...rows].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
  }, [all, filter]);
  const pendingCount = all.filter((x) => x.status === 'pending').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader
        title="Mes transactions"
        subtitle={pendingCount > 0 ? `${pendingCount} en attente de confirmation` : undefined}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => (
            <Chip key={f.id} kind="choice" label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </ScrollView>
      </View>
      {q.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} radius={t.radius.md} />
          ))}
        </View>
      ) : q.isError ? (
        <ErrorState message="Impossible de charger vos transactions." onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(x) => String(x.id)}
          contentContainerStyle={[styles.list, list.length === 0 && styles.grow]}
          renderItem={({ item }) => (
            <TransactionPanel
              transactionId={item.id}
              myId={user?.id}
              showTitle
              onOpenListing={(postId) => router.push({ pathname: '/item-details', params: { id: String(postId) } })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
              colors={[t.colors.brandStrong]}
              tintColor={t.colors.brandStrong}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={filter === 'all' ? 'Aucune transaction' : 'Rien ici'}
              message="Quand une offre est acceptée dans une conversation, la transaction apparaît ici : vous confirmez l’échange puis laissez un avis."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  grow: { flexGrow: 1 },
});

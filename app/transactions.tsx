// app/transactions.tsx — "Achats et ventes" (docs/11 §4.2, MB-TRD-04/05,
// docs/12 layout): large title, Achats / Ventes segments, then every deal
// born from an accepted offer as a flat row (thumb, title, amount, status,
// meeting) separated by hairlines. A row opens the deal page
// (/deal?id=), where the actions live. Pending deals first: they need action.
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import FadeInView, { useFirstPaint } from '@/components/motion/FadeInView';
import { layoutSpring } from '@/components/motion/anim';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppImage,
  AppText,
  Badge,
  EmptyState,
  ErrorState,
  IconButton,
  PressableScale,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { STATUS_TONE } from '@/components/organisms/TransactionPanel';
import type { BdTransaction } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { postByIdQuery } from '@/lib/api/posts';
import { meetingSummary, TXN_STATUS_LABEL, transactionsQuery } from '@/lib/api/transactions';
import { formatAmount } from '@/lib/format';
import { coverThumb } from '@/lib/images';
import { useTheme } from '@/theme';

type Side = 'buy' | 'sell';

const ORDER: Record<string, number> = { pending: 0, disputed: 1, completed: 2, cancelled: 3 };

function DealRow({ txn, iAmSeller, onPress }: { txn: BdTransaction; iAmSeller: boolean; onPress: () => void }) {
  const t = useTheme();
  // The list has no thumbnail: the post detail is usually cached already.
  const post = useQuery({ ...postByIdQuery(txn.post_id), staleTime: 5 * 60_000 });
  const other = iAmSeller ? txn.buyer : txn.seller;
  const meeting = txn.status === 'pending' ? meetingSummary(txn) : null;
  const status = TXN_STATUS_LABEL[txn.status] ?? txn.status;
  const line =
    txn.status === 'pending'
      ? meeting
        ? `Rendez-vous ${meeting}`
        : 'Rendez-vous à fixer'
      : other?.username
        ? `avec ${other.username}`
        : null;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${txn.post_title ?? 'Annonce'}, ${formatAmount(txn.amount)}, ${status}${line ? `, ${line}` : ''}`}
      accessibilityHint="Ouvre le suivi de l’affaire"
      onPress={onPress}
      style={styles.row}>
      <AppImage uri={coverThumb(post.data?.images)} style={[styles.thumb, { borderRadius: t.radius.sm }]} recyclingKey={`p${txn.post_id}`} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <AppText variant="labelStrong" numberOfLines={1} style={styles.flex}>
            {txn.post_title ?? 'Annonce'}
          </AppText>
          <Badge label={status} tone={STATUS_TONE[txn.status] ?? 'neutral'} />
        </View>
        <AppText variant="price" style={styles.amount}>
          {formatAmount(txn.amount)}
        </AppText>
        {!!line && (
          <View style={styles.meetRow}>
            {txn.status === 'pending' && (
              <Ionicons name={meeting ? 'location-outline' : 'time-outline'} size={14} color={meeting ? t.colors.brandStrong : t.colors.warning} />
            )}
            <AppText variant="caption" color={txn.status === 'pending' ? (meeting ? 'brandStrong' : 'warning') : 'inkMuted'} numberOfLines={1} style={styles.flex}>
              {line}
            </AppText>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
    </PressableScale>
  );
}

export default function TransactionsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const myId = user?.id;
  const q = useQuery(transactionsQuery());
  const [side, setSide] = useState<Side>('buy');
  const [sidePicked, setSidePicked] = useState(false);

  const all = q.data ?? [];
  const buys = useMemo(() => all.filter((x) => x.buyer_id === myId), [all, myId]);
  const sells = useMemo(() => all.filter((x) => x.seller_id === myId), [all, myId]);

  // Open on the side that has something, unless the user already chose.
  useEffect(() => {
    if (sidePicked || !q.data) return;
    if (buys.length === 0 && sells.length > 0) setSide('sell');
  }, [q.data, buys.length, sells.length, sidePicked]);

  const list = useMemo(
    () =>
      [...(side === 'buy' ? buys : sells)].sort(
        (a, b) =>
          (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || (b.created_at ?? '').localeCompare(a.created_at ?? ''),
      ),
    [side, buys, sells],
  );
  const pendingOf = (rows: BdTransaction[]) => rows.filter((x) => x.status === 'pending').length;
  // Rows stagger in on the first paint only; afterwards (refetch, Achats ↔
  // Ventes) rows that move reflow with a layout spring.
  const firstPaint = useFirstPaint(!!q.data);
  const label = (base: string, rows: BdTransaction[]) => (pendingOf(rows) ? `${base} · ${pendingOf(rows)}` : base);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.colors.surface }]} edges={['top']}>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-back"
          label="Retour"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as Href))}
        />
      </View>
      <AppText variant="display" accessibilityRole="header" style={styles.bigTitle}>
        Achats et ventes
      </AppText>
      <View style={styles.segment}>
        <SegmentedControl<Side>
          accessibilityLabel="Afficher les achats ou les ventes"
          segments={[
            { value: 'buy', label: label('Achats', buys) },
            { value: 'sell', label: label('Ventes', sells) },
          ]}
          value={side}
          onChange={(v) => {
            setSidePicked(true);
            setSide(v);
          }}
        />
      </View>
      {q.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skelRow}>
              <Skeleton width={64} height={64} radius={t.radius.sm} />
              <View style={[styles.flex, styles.skelText]}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="40%" height={18} />
                <Skeleton width="55%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : q.isError && !q.data ? (
        <ErrorState message="Impossible de charger vos achats et ventes." onRetry={() => q.refetch()} />
      ) : (
        <Animated.FlatList
          data={list}
          itemLayoutAnimation={firstPaint ? undefined : layoutSpring()}
          keyExtractor={(x) => String(x.id)}
          contentContainerStyle={[styles.list, list.length === 0 && styles.grow]}
          ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: t.colors.line }]} />}
          renderItem={({ item, index }) => (
            <FadeInView index={index} animate={firstPaint}>
              <DealRow
                txn={item}
                iAmSeller={item.seller_id === myId}
                onPress={() => router.push({ pathname: '/deal', params: { id: String(item.id) } } as unknown as Href)}
              />
            </FadeInView>
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
              title={side === 'buy' ? 'Aucun achat' : 'Aucune vente'}
              message="Quand une offre est acceptée dans une conversation, l’affaire apparaît ici : vous fixez le rendez-vous, confirmez l’échange puis laissez un avis."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', paddingHorizontal: 4, minHeight: 48, alignItems: 'center' },
  bigTitle: { paddingHorizontal: 16, marginTop: 4 },
  segment: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  grow: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 88 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  skelRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  skelText: { gap: 8, justifyContent: 'center' },
  thumb: { width: 64, height: 64 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { marginTop: 2 },
  meetRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});

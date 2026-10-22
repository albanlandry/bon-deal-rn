/**
 * The deal after an accepted offer (MB-TRD-04/05/06): status, then the one
 * next step for this party — confirm the sale happened or cancel it while
 * pending; once completed, leave a review (prompted right after completion,
 * peak–end) or report a problem (dispute).
 * A 3-step DealTimeline shows where the deal stands. In the chat it can fold
 * to a one-line summary (`collapsible`): open while this party has something
 * to do, folded once they've seen a settled deal.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TXN_STATUS_LABEL } from '@/lib/api/transactions';
import { formatAmount, formatDayLabel } from '@/lib/format';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Badge, { BadgeTone } from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import Skeleton from '../atoms/Skeleton';
import { enterFade, exitFade, layoutEase } from '../motion/anim';
import PressableScale from '../motion/PressableScale';
import DealTimeline from '../molecules/DealTimeline';
import { useDealActions } from './DealActions';

export const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
};

/** Deal states already shown this session (`id:status:reviewed`): those fold. */
const SEEN = new Set<string>();

export interface TransactionPanelProps {
  transactionId: number;
  myId: number | undefined;
  /** Show the listing title (lists); hidden in the chat where it's in the header. */
  showTitle?: boolean;
  onOpenListing?: (postId: number) => void;
  /** Can fold to a one-line summary (the chat, where space is tight). */
  collapsible?: boolean;
  /** The sale/purchase was just confirmed: the host fires `Celebrate`. */
  onCompleted?: () => void;
}

export default function TransactionPanel({
  transactionId,
  myId,
  showTitle,
  onOpenListing,
  collapsible,
  onCompleted,
}: TransactionPanelProps) {
  const t = useTheme();
  const { q, txn, reviewed, iAmSeller, otherName, busy, confirm, confirming, openSheet, sheets } = useDealActions({
    transactionId,
    myId,
    onCompleted,
  });
  // null = automatic (open when an action is needed or not yet seen).
  const [expanded, setExpanded] = useState<boolean | null>(null);

  const actionNeeded = txn?.status === 'pending' || (txn?.status === 'completed' && !reviewed);
  const seenKey = txn ? `${txn.id}:${txn.status}:${reviewed}` : null;
  // Captured on first sight of this state, so it stays open for this visit.
  const seenBefore = useRef<Record<string, boolean>>({});
  if (seenKey && !(seenKey in seenBefore.current)) seenBefore.current[seenKey] = SEEN.has(seenKey);
  useEffect(() => {
    if (seenKey) SEEN.add(seenKey);
  }, [seenKey]);
  // A new step that needs this party reopens the panel.
  useEffect(() => setExpanded(null), [actionNeeded]);

  if (q.isLoading) return <Skeleton height={88} radius={t.radius.md} />;
  if (!txn) {
    return (
      <Card style={styles.card}>
        <View style={styles.header} accessibilityRole="alert">
          <Ionicons name="alert-circle-outline" size={20} color={t.colors.danger} />
          <AppText variant="small" color="inkMuted" style={styles.flex}>
            Impossible de charger la transaction.
          </AppText>
          <Button label="Réessayer" size="sm" variant="ghost" onPress={() => q.refetch()} loading={q.isFetching} />
        </View>
      </Card>
    );
  }

  const open = !collapsible || (expanded ?? (actionNeeded || !seenBefore.current[seenKey!]));
  const statusLabel = TXN_STATUS_LABEL[txn.status] ?? txn.status;
  const summary = `${iAmSeller ? 'Vente' : 'Achat'} · ${formatAmount(txn.amount)}`;

  const helper =
    txn.status === 'pending'
      ? `Une fois l’échange fait avec ${otherName}, confirmez-le ici.`
      : txn.status === 'completed'
        ? reviewed
          ? 'Échange conclu. Merci pour votre avis !'
          : `Échange conclu ${formatDayLabel(txn.completed_at).toLowerCase()}. Laissez un avis à ${otherName}.`
        : txn.status === 'disputed'
          ? 'Litige en cours d’examen par l’équipe BonDeal.'
          : txn.cancellation_reason
            ? `Annulée : ${txn.cancellation_reason}`
            : 'Transaction annulée.';

  const titleText = (
    <AppText variant="labelStrong" color={onOpenListing ? 'brandStrong' : 'ink'} numberOfLines={1}>
      {txn.post_title ?? 'Annonce'}
    </AppText>
  );

  return (
    <Card style={styles.card}>
      <Animated.View layout={layoutEase()} style={styles.body}>
        {collapsible ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${summary}, ${statusLabel}`}
            accessibilityHint={open ? 'Réduire le suivi de la transaction' : 'Afficher le suivi de la transaction'}
            accessibilityState={{ expanded: open }}
            onPress={() => setExpanded(!open)}
            style={styles.header}>
            <Ionicons name="receipt-outline" size={20} color={t.colors.inkMuted} />
            <AppText variant="labelStrong" numberOfLines={1} style={styles.flex}>
              {summary}
            </AppText>
            <Badge label={statusLabel} tone={STATUS_TONE[txn.status] ?? 'neutral'} />
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.colors.inkSubtle} />
          </PressableScale>
        ) : (
          <View style={styles.header}>
            <Ionicons name="receipt-outline" size={20} color={t.colors.inkMuted} />
            <View style={styles.flex}>
              {showTitle &&
                (onOpenListing ? (
                  <PressableScale
                    accessibilityRole="link"
                    accessibilityLabel={`Voir l’annonce ${txn.post_title ?? ''}`}
                    hitSlop={8}
                    onPress={() => onOpenListing(txn.post_id)}>
                    {titleText}
                  </PressableScale>
                ) : (
                  titleText
                ))}
              <AppText variant={showTitle ? 'caption' : 'labelStrong'} color={showTitle ? 'inkMuted' : 'ink'}>
                {summary}
                {showTitle ? ` · avec ${otherName}` : ''}
              </AppText>
            </View>
            <Badge label={statusLabel} tone={STATUS_TONE[txn.status] ?? 'neutral'} />
          </View>
        )}

        {open && (
          <Animated.View entering={enterFade()} exiting={exitFade()} style={styles.body}>
            <DealTimeline status={txn.status} reviewed={reviewed} />
            <AppText variant="caption" color="inkMuted">
              {helper}
            </AppText>

            {txn.status === 'pending' && (
              <View style={styles.actions}>
                <Button
                  label={iAmSeller ? 'Vente conclue' : 'Article reçu'}
                  icon="checkmark-done"
                  onPress={confirm}
                  loading={confirming}
                  disabled={busy}
                  style={styles.flex}
                />
                <Button
                  label={iAmSeller ? 'Annuler la vente' : 'Annuler l’achat'}
                  variant="ghost"
                  onPress={() => openSheet('cancel')}
                  disabled={busy}
                />
              </View>
            )}
            {txn.status === 'completed' && (
              <View style={styles.actions}>
                {!reviewed && (
                  <Button label="Laisser un avis" icon="star-outline" onPress={() => openSheet('review')} style={styles.flex} />
                )}
                <Button label="Signaler un problème" variant="ghost" onPress={() => openSheet('dispute')} disabled={busy} />
              </View>
            )}
          </Animated.View>
        )}
      </Animated.View>

      {sheets}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  body: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
});

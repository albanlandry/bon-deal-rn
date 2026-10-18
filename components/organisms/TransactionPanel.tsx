/**
 * The deal after an accepted offer (MB-TRD-04/05/06): status, then the one
 * next step for this party — confirm the sale happened or cancel it while
 * pending; once completed, leave a review (prompted right after completion,
 * peak–end) or report a problem (dispute).
 */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BdTransaction } from '@/constants/types';
import {
  createReview,
  openDispute,
  TXN_STATUS_LABEL,
  transactionErrorMessage,
  transactionQuery,
  updateTransactionStatus,
} from '@/lib/api/transactions';
import { formatAmount, formatDayLabel } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Badge, { BadgeTone } from '../atoms/Badge';
import Button from '../atoms/Button';
import Card from '../atoms/Card';
import RatingStars from '../atoms/RatingStars';
import Skeleton from '../atoms/Skeleton';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import Sheet from './Sheet';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
};

const RATING_WORDS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent'];

export interface TransactionPanelProps {
  transactionId: number;
  myId: number | undefined;
  /** Show the listing title (lists); hidden in the chat where it's in the header. */
  showTitle?: boolean;
  onOpenListing?: (postId: number) => void;
}

export default function TransactionPanel({ transactionId, myId, showTitle, onOpenListing }: TransactionPanelProps) {
  const t = useTheme();
  const qc = useQueryClient();
  const q = useQuery(transactionQuery(transactionId));
  const txn = q.data;
  const [sheet, setSheet] = useState<null | 'cancel' | 'dispute' | 'review'>(null);
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const refresh = (next?: BdTransaction) => {
    if (next) qc.setQueryData<BdTransaction>(['transaction', transactionId], (old) => ({ ...old, ...next }));
    qc.invalidateQueries({ queryKey: ['transaction', transactionId] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['posts'] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['conversation'] });
  };

  const openSheet = (s: 'cancel' | 'dispute' | 'review') => {
    setReason('');
    setComment('');
    setRating(0);
    setSheet(s);
  };

  const statusMut = useMutation({
    mutationFn: (v: { status: 'completed' | 'cancelled'; reason?: string }) =>
      updateTransactionStatus(transactionId, v.status, v.reason),
    onSuccess: (next, v) => {
      refresh(next);
      setSheet(null);
      if (v.status === 'completed') {
        haptics.success();
        showToast.success(
          next.seller_id === myId ? 'Vente conclue' : 'Achat confirmé',
          'Merci ! Dites-nous comment ça s’est passé.',
        );
        openSheet('review');
      } else {
        showToast.info('Transaction annulée', 'L’annonce est de nouveau disponible.');
      }
    },
    onError: (e) => showToast.error('Transaction', transactionErrorMessage(e)),
  });

  const disputeMut = useMutation({
    mutationFn: () => openDispute(transactionId, reason),
    onSuccess: (next) => {
      refresh(next);
      setSheet(null);
      showToast.success('Litige ouvert', 'Notre équipe va examiner la situation et vous contacter.');
    },
    onError: (e) => showToast.error('Litige', transactionErrorMessage(e)),
  });

  const reviewMut = useMutation({
    mutationFn: () => createReview(transactionId, rating, comment),
    onSuccess: () => {
      haptics.success();
      refresh();
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      setSheet(null);
      showToast.success('Merci pour votre avis', 'Il aide toute la communauté.');
    },
    onError: (e) => showToast.error('Avis', transactionErrorMessage(e)),
  });

  if (q.isLoading) return <Skeleton height={88} radius={t.radius.md} />;
  if (!txn) return null;

  const iAmSeller = txn.seller_id === myId;
  const other = iAmSeller ? txn.buyer : txn.seller;
  const otherName = other?.username ?? (iAmSeller ? 'l’acheteur' : 'le vendeur');
  const reviewed = (txn.reviews ?? []).some((r) => r.reviewer_id === myId);
  const busy = statusMut.isPending || disputeMut.isPending;

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

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={18} color={t.colors.inkMuted} />
        <View style={styles.flex}>
          {showTitle && (
            <AppText
              variant="labelStrong"
              numberOfLines={1}
              onPress={onOpenListing ? () => onOpenListing(txn.post_id) : undefined}>
              {txn.post_title ?? 'Annonce'}
            </AppText>
          )}
          <AppText variant={showTitle ? 'caption' : 'labelStrong'} color={showTitle ? 'inkMuted' : 'ink'}>
            {iAmSeller ? 'Vente' : 'Achat'} · {formatAmount(txn.amount)}
            {showTitle ? ` · avec ${otherName}` : ''}
          </AppText>
        </View>
        <Badge label={TXN_STATUS_LABEL[txn.status] ?? txn.status} tone={STATUS_TONE[txn.status] ?? 'neutral'} />
      </View>
      <AppText variant="caption" color="inkMuted">
        {helper}
      </AppText>

      {txn.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            label={iAmSeller ? 'Vente conclue' : 'Article reçu'}
            icon="checkmark-done"
            size="sm"
            onPress={() => statusMut.mutate({ status: 'completed' })}
            loading={statusMut.isPending && statusMut.variables?.status === 'completed'}
            disabled={busy}
            style={styles.flex}
          />
          <Button label="Annuler" size="sm" variant="ghost" onPress={() => openSheet('cancel')} disabled={busy} />
        </View>
      )}
      {txn.status === 'completed' && (
        <View style={styles.actions}>
          {!reviewed && (
            <Button label="Laisser un avis" icon="star-outline" size="sm" onPress={() => openSheet('review')} style={styles.flex} />
          )}
          <Button label="Signaler un problème" size="sm" variant="ghost" onPress={() => openSheet('dispute')} disabled={busy} />
        </View>
      )}

      {/* Cancel */}
      <Sheet
        visible={sheet === 'cancel'}
        onClose={() => setSheet(null)}
        title="Annuler la transaction ?"
        footer={
          <View style={styles.sheetActions}>
            <Button
              label="Annuler la transaction"
              variant="danger"
              onPress={() => statusMut.mutate({ status: 'cancelled', reason })}
              loading={statusMut.isPending}
              fullWidth
            />
            <Button label="Garder" variant="ghost" onPress={() => setSheet(null)} fullWidth />
          </View>
        }>
        <AppText variant="small" color="inkMuted" style={styles.para}>
          L’annonce redevient disponible pour les autres acheteurs. {otherName} sera informé(e) dans la conversation.
        </AppText>
        <TextField
          label="Raison (facultatif)"
          placeholder="Ex. : l’acheteur ne s’est pas présenté"
          value={reason}
          onChangeText={setReason}
          maxLength={300}
        />
      </Sheet>

      {/* Dispute */}
      <Sheet
        visible={sheet === 'dispute'}
        onClose={() => setSheet(null)}
        title="Signaler un problème"
        footer={
          <Button
            label="Ouvrir un litige"
            variant="danger"
            icon="alert-circle-outline"
            onPress={() => disputeMut.mutate()}
            loading={disputeMut.isPending}
            disabled={reason.trim().length < 10}
            disabledReason={reason.trim().length < 10 ? 'Décrivez le problème (10 caractères minimum).' : undefined}
            fullWidth
          />
        }>
        <AppText variant="small" color="inkMuted" style={styles.para}>
          Article non conforme, paiement non reçu… L’équipe BonDeal examinera la transaction avec vous et l’autre partie.
        </AppText>
        <TextField
          label="Que s’est-il passé ?"
          value={reason}
          onChangeText={setReason}
          multiline
          maxLength={500}
          showCount
        />
      </Sheet>

      {/* Review */}
      <Sheet
        visible={sheet === 'review'}
        onClose={() => setSheet(null)}
        title={`Votre avis sur ${otherName}`}
        footer={
          <View style={styles.sheetActions}>
            <Button
              label="Publier l’avis"
              onPress={() => reviewMut.mutate()}
              loading={reviewMut.isPending}
              disabled={rating === 0}
              disabledReason={rating === 0 ? 'Choisissez une note de 1 à 5 étoiles.' : undefined}
              fullWidth
            />
            <Button label="Plus tard" variant="ghost" onPress={() => setSheet(null)} fullWidth />
          </View>
        }>
        <AppText variant="small" color="inkMuted" style={styles.para}>
          Comment s’est passé {iAmSeller ? 'cette vente' : 'cet achat'} ? Votre avis sera public sur son profil.
        </AppText>
        <View style={styles.stars}>
          <RatingStars value={rating} onChange={setRating} size={36} showValue={false} />
          <AppText variant="labelStrong" color={rating ? 'ink' : 'inkSubtle'}>
            {rating ? RATING_WORDS[rating] : 'Touchez une étoile'}
          </AppText>
        </View>
        <TextField
          label="Commentaire (facultatif)"
          placeholder="Ponctuel, article conforme, échange agréable…"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={1000}
          showCount
        />
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sheetActions: { gap: 4 },
  para: { marginBottom: 12 },
  stars: { alignItems: 'center', gap: 8, marginBottom: 16 },
});

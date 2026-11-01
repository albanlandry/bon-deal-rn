/**
 * The actions of a deal (MB-TRD-04/05/06), shared by TransactionPanel (chat,
 * lists) and the deal page: confirm the hand-over or cancel while pending;
 * once completed, leave a review (prompted right after completion, peak–end)
 * or report a problem (dispute). The hook owns the mutations and the three
 * sheets; the host renders `sheets` once and wires its own buttons.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BdTransaction } from '@/constants/types';
import {
  createReview,
  openDispute,
  transactionErrorMessage,
  transactionQuery,
  updateTransactionStatus,
} from '@/lib/api/transactions';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import RatingStars from '../atoms/RatingStars';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import { CELEBRATE_MS } from '../motion/Celebrate';
import Sheet from './Sheet';

const RATING_WORDS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent'];

export type DealSheet = 'cancel' | 'dispute' | 'review';

export interface UseDealActionsOptions {
  transactionId: number;
  myId: number | undefined;
  /** The sale/purchase was just confirmed: the host fires `Celebrate`. */
  onCompleted?: () => void;
}

export function useDealActions({ transactionId, myId, onCompleted }: UseDealActionsOptions) {
  const t = useTheme();
  const qc = useQueryClient();
  const q = useQuery(transactionQuery(transactionId));
  const txn = q.data;
  const [sheet, setSheet] = useState<DealSheet | null>(null);
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (reviewTimer.current) clearTimeout(reviewTimer.current);
    },
    [],
  );

  const refresh = (next?: BdTransaction) => {
    if (next) qc.setQueryData<BdTransaction>(['transaction', transactionId], (old) => ({ ...old, ...next }));
    qc.invalidateQueries({ queryKey: ['transaction', transactionId] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['posts'] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['conversation'] });
  };

  const openSheet = (s: DealSheet) => {
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
        onCompleted?.(); // peak–end: the host's confetti, then the review prompt
        showToast.success(
          next.seller_id === myId ? 'Vente conclue' : 'Achat confirmé',
          'Merci ! Dites-nous comment ça s’est passé.',
        );
        // The sheet is a modal: let the burst play first.
        reviewTimer.current = setTimeout(() => openSheet('review'), onCompleted && !t.reduceMotion ? CELEBRATE_MS : 0);
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

  const reviewed = (txn?.reviews ?? []).some((r) => r.reviewer_id === myId);
  const iAmSeller = !!txn && txn.seller_id === myId;
  const other = txn ? (iAmSeller ? txn.buyer : txn.seller) : null;
  const otherName = other?.username ?? (iAmSeller ? 'l’acheteur' : 'le vendeur');
  const busy = statusMut.isPending || disputeMut.isPending;
  const confirm = () => statusMut.mutate({ status: 'completed' });
  const confirming = statusMut.isPending && statusMut.variables?.status === 'completed';

  const sheets = (
    <>
      {/* Cancel */}
      <Sheet
        visible={sheet === 'cancel'}
        onClose={() => setSheet(null)}
        title={iAmSeller ? 'Annuler la vente ?' : 'Annuler l’achat ?'}
        footer={
          <View style={styles.sheetActions}>
            <Button
              label={iAmSeller ? 'Annuler la vente' : 'Annuler l’achat'}
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
        <TextField label="Que s’est-il passé ?" value={reason} onChangeText={setReason} multiline maxLength={500} showCount />
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
    </>
  );

  return { q, txn, reviewed, iAmSeller, otherName, busy, confirm, confirming, openSheet, sheets };
}

const styles = StyleSheet.create({
  sheetActions: { gap: 4 },
  para: { marginBottom: 12 },
  stars: { alignItems: 'center', gap: 8, marginBottom: 16 },
});

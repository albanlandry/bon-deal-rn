/**
 * The open appointment of a conversation (docs/14 §8), in the chat header and
 * on the deal page: state chip, when and where, and the actions the server
 * allows (`can_*`): confirm, change, cancel, and after the meeting "Vendu" /
 * "Pas conclu". Stale versions (the other party changed it) re-fetch.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import {
  APPOINTMENT_STATUS_LABEL,
  appointmentErrorMessage,
  appointmentShareText,
  cancelAppointment,
  confirmAppointment,
  isStaleAppointmentError,
  placeSummary,
  reportOutcome,
  type BdAppointment,
} from '@/lib/api/appointments';
import { formatMeetingWhen, parseServerDate } from '@/lib/api/transactions';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Badge from '../atoms/Badge';
import Button from '../atoms/Button';
import { showToast } from '../atoms/Toast';

export interface AppointmentCardProps {
  appointment: BdAppointment;
  myId: number | undefined;
  otherName: string;
  postTitle?: string;
  /** Opens the AppointmentSheet on this appointment. */
  onEdit: () => void;
}

export default function AppointmentCard({ appointment: a, myId, otherName, postTitle, onEdit }: AppointmentCardProps) {
  const t = useTheme();
  const qc = useQueryClient();
  const at = parseServerDate(a.starts_at);
  const where = placeSummary(a.place);
  const mineProposal = a.proposed_by_id === myId;
  const iAmSeller = a.seller_id === myId;
  const confirmed = a.status === 'confirmed';

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['appointment', a.conversation_id] });
    qc.invalidateQueries({ queryKey: ['conversation', a.conversation_id] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    if (a.transaction_id) qc.invalidateQueries({ queryKey: ['transaction', a.transaction_id] });
    qc.invalidateQueries({ queryKey: ['post', a.post_id] });
  };
  const onError = (e: unknown) => {
    showToast.error('Rendez-vous', appointmentErrorMessage(e));
    if (isStaleAppointmentError(e)) refresh();
  };

  const confirmMut = useMutation({
    mutationFn: () => confirmAppointment(a),
    onSuccess: () => {
      haptics.success();
      showToast.success('Rendez-vous confirmé', 'L’annonce est réservée pour vous deux.');
      refresh();
    },
    onError,
  });
  const cancelMut = useMutation({
    mutationFn: () => cancelAppointment(a),
    onSuccess: () => {
      showToast.info('Rendez-vous annulé', confirmed ? 'L’annonce est de nouveau disponible.' : undefined);
      refresh();
    },
    onError,
  });
  const outcomeMut = useMutation({
    mutationFn: (sold: boolean) => reportOutcome(a, sold),
    onSuccess: (res, sold) => {
      if (sold && res.appointment.status === 'done') {
        haptics.success();
        showToast.success('Vente conclue', 'Pensez à laisser un avis.');
      } else if (sold) {
        showToast.info('Merci !', 'Le vendeur doit confirmer la vente.');
      } else {
        showToast.info('Vente non conclue', 'L’annonce est de nouveau disponible.');
      }
      refresh();
    },
    onError,
  });
  const busy = confirmMut.isPending || cancelMut.isPending || outcomeMut.isPending;

  const askCancel = () =>
    Alert.alert(
      'Annuler le rendez-vous ?',
      confirmed ? 'La réservation sera levée et l’annonce de nouveau disponible.' : `${otherName} sera prévenu.`,
      [
        { text: 'Garder', style: 'cancel' },
        { text: 'Annuler le rendez-vous', style: 'destructive', onPress: () => cancelMut.mutate() },
      ],
    );
  const askNotSold = () =>
    Alert.alert('La vente ne s’est pas faite ?', 'La réservation sera levée.', [
      { text: 'Retour', style: 'cancel' },
      { text: 'Pas conclu', style: 'destructive', onPress: () => outcomeMut.mutate(false) },
    ]);
  const share = () =>
    Share.share({ message: appointmentShareText(a, postTitle, otherName) }).catch(() => {});

  const stateLine = a.status === 'proposed'
    ? mineProposal
      ? `En attente de la confirmation de ${otherName}`
      : `${otherName} propose ce rendez-vous`
    : a.sale_reported_at && confirmed
      ? iAmSeller
        ? `${otherName} indique que la vente a eu lieu`
        : 'En attente de la confirmation du vendeur'
      : null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Rendez-vous ${APPOINTMENT_STATUS_LABEL[a.status]} : ${at ? formatMeetingWhen(at) : ''}${where ? `, ${where}` : ''}`}
      style={[styles.card, { backgroundColor: t.colors.canvas, borderColor: t.colors.line, borderRadius: t.radius.md }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: t.colors.brandTint, borderRadius: t.radius.sm }]}>
          <Ionicons name="calendar" size={18} color={t.colors.brandStrong} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {at ? capitalize(formatMeetingWhen(at)) : 'Rendez-vous'}
          </AppText>
          <AppText variant="small" color="inkMuted" numberOfLines={2}>
            {where ?? 'Lieu à préciser'}
          </AppText>
        </View>
        <Badge label={APPOINTMENT_STATUS_LABEL[a.status]} tone={confirmed ? 'success' : 'warning'} />
      </View>
      {stateLine && (
        <AppText variant="caption" color="inkMuted">
          {stateLine}
        </AppText>
      )}

      <View style={styles.actions}>
        {a.can_report_outcome ? (
          <>
            {!(a.sale_reported_at && !iAmSeller) && (
              <Button
                size="sm"
                label={iAmSeller ? 'Vendu' : 'C’est fait'}
                icon="checkmark-done"
                onPress={() => outcomeMut.mutate(true)}
                loading={outcomeMut.isPending && outcomeMut.variables === true}
                disabled={busy}
              />
            )}
            <Button size="sm" variant="secondary" label="Pas conclu" onPress={askNotSold} disabled={busy} />
          </>
        ) : (
          <>
            {a.can_confirm && (
              <Button
                size="sm"
                label="Confirmer"
                icon="checkmark"
                onPress={() => confirmMut.mutate()}
                loading={confirmMut.isPending}
                disabled={busy}
              />
            )}
            {a.can_edit && (
              <Button
                size="sm"
                variant="secondary"
                label={a.can_confirm ? 'Autre horaire' : 'Modifier'}
                onPress={onEdit}
                disabled={busy}
              />
            )}
            {a.can_cancel && <Button size="sm" variant="ghost" label="Annuler" onPress={askCancel} disabled={busy} />}
          </>
        )}
        {confirmed && (
          <Button size="sm" variant="ghost" icon="share-outline" label="Partager" onPress={share} disabled={busy} />
        )}
      </View>
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

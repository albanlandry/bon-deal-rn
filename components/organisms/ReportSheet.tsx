/**
 * "Signaler" bottom sheet (MB-TS-01): one reason (radio list mirroring the
 * API enum) + optional comment → POST /reports. Reused for listings, users,
 * chat messages and reviews. An existing open report is not an error: the
 * user is told it is already being reviewed.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BdReportReason, BdReportTarget } from '@/constants/types';
import { createReport, reportErrorMessage } from '@/lib/api/safety';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import Sheet from './Sheet';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const REASONS: { value: BdReportReason; label: string; hint: string; icon: IconName; targets?: BdReportTarget[] }[] = [
  { value: 'scam', label: 'Arnaque ou fraude', hint: 'Paiement à l’avance, faux article, usurpation', icon: 'warning-outline' },
  {
    value: 'prohibited_item',
    label: 'Article interdit',
    hint: 'Armes, médicaments, contrefaçons, animaux protégés…',
    icon: 'ban-outline',
    targets: ['post'],
  },
  { value: 'harassment', label: 'Harcèlement ou menaces', hint: 'Insultes répétées, intimidation', icon: 'hand-left-outline' },
  { value: 'offensive', label: 'Contenu choquant', hint: 'Propos haineux, images inappropriées', icon: 'eye-off-outline' },
  { value: 'fake_profile', label: 'Faux profil', hint: 'Identité inventée ou usurpée', icon: 'person-remove-outline' },
  { value: 'spam', label: 'Spam', hint: 'Publicité, annonces en double, liens douteux', icon: 'mail-unread-outline' },
  { value: 'other', label: 'Autre raison', hint: 'Précisez dans le commentaire', icon: 'ellipsis-horizontal-circle-outline' },
];

const TITLES: Record<BdReportTarget, string> = {
  post: 'Signaler l’annonce',
  user: 'Signaler ce membre',
  message: 'Signaler le message',
  review: 'Signaler l’avis',
};

export interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: BdReportTarget;
  targetId: number | null;
  /** Optional context line, e.g. the listing title or the member's name. */
  subject?: string | null;
}

export default function ReportSheet({ visible, onClose, targetType, targetId, subject }: ReportSheetProps) {
  const t = useTheme();
  const [reason, setReason] = useState<BdReportReason | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (visible) {
      setReason(null);
      setComment('');
    }
  }, [visible, targetId]);

  const mut = useMutation({
    mutationFn: () =>
      createReport({ targetType, targetId: targetId!, reason: reason!, description: comment }),
    onSuccess: (res) => {
      haptics.success();
      if (res.alreadyReported) {
        showToast.info('Déjà signalé', 'Votre signalement précédent est en cours d’examen.');
      } else {
        showToast.success('Merci pour votre signalement', 'Notre équipe va l’examiner rapidement.');
      }
      onClose();
    },
    onError: (e) => showToast.error('Signalement', reportErrorMessage(e)),
  });

  const reasons = REASONS.filter((r) => !r.targets || r.targets.includes(targetType));
  const needsComment = reason === 'other' && !comment.trim();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={TITLES[targetType]}
      footer={
        <Button
          label="Envoyer le signalement"
          icon="flag-outline"
          variant="danger"
          onPress={() => mut.mutate()}
          loading={mut.isPending}
          disabled={!reason || !targetId || needsComment}
          disabledReason={
            !reason ? 'Choisissez une raison.' : needsComment ? 'Précisez la raison en quelques mots.' : undefined
          }
          fullWidth
        />
      }>
      {!!subject && (
        <AppText variant="small" color="inkMuted" numberOfLines={2} style={styles.subject}>
          {subject}
        </AppText>
      )}
      <AppText variant="small" color="inkMuted" style={styles.intro}>
        Votre signalement est anonyme : la personne concernée ne saura pas qu’il vient de vous.
      </AppText>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {reasons.map((r) => {
          const selected = reason === r.value;
          return (
            <Pressable
              key={r.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${r.label}. ${r.hint}`}
              onPress={() => {
                haptics.selection();
                setReason(r.value);
              }}
              style={({ pressed }) => [
                styles.row,
                {
                  borderColor: selected ? t.colors.brandStrong : t.colors.line,
                  backgroundColor: selected ? t.colors.brandTint : t.colors.surface,
                  borderRadius: t.radius.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Ionicons name={r.icon} size={20} color={selected ? t.colors.brandStrong : t.colors.inkMuted} />
              <View style={styles.flex}>
                <AppText variant="labelStrong">{r.label}</AppText>
                <AppText variant="caption" color="inkMuted">
                  {r.hint}
                </AppText>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? t.colors.brandStrong : t.colors.inkSubtle}
              />
            </Pressable>
          );
        })}
      </View>
      <TextField
        label={reason === 'other' ? 'Commentaire' : 'Commentaire (facultatif)'}
        placeholder="Ce qui s’est passé, en quelques mots"
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={1000}
        showCount
        containerStyle={styles.comment}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  subject: { marginBottom: 4 },
  intro: { marginBottom: 12 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, minHeight: 56 },
  flex: { flex: 1 },
  comment: { marginTop: 16 },
});

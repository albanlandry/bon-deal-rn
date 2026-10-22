/**
 * Fix or change the hand-over meeting of a pending deal (docs/11 §4.2,
 * PATCH /transactions/{id}/meeting). Place: free text with public-place
 * suggestions; time: day chips (Aujourd’hui, Demain, the next days) and hour
 * chips — no native date picker. Past hours of today are disabled; the server
 * still checks (meeting_in_past / meeting_too_far).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { BdTransaction } from '@/constants/types';
import { meetingErrorMessage, parseServerDate, updateMeeting } from '@/lib/api/transactions';
import { haptics } from '@/lib/haptics';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import Chip from '../atoms/Chip';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import Sheet from './Sheet';

/** Generic public places: busy, visible, and found in every quartier. */
const PLACE_SUGGESTIONS = [
  'Devant la pharmacie',
  'Station-service',
  'Entrée du supermarché',
  'Au marché',
  'Rond-point du quartier',
];

const HOURS = [8, 10, 12, 14, 16, 17, 18, 19];
const DAYS_AHEAD = 7;
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad2 = (n: number) => String(n).padStart(2, '0');

function dayLabel(offset: number, d: Date): string {
  if (offset === 0) return 'Aujourd’hui';
  if (offset === 1) return 'Demain';
  return `${WEEKDAYS[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

export interface MeetingSheetProps {
  visible: boolean;
  onClose: () => void;
  txn: BdTransaction;
  /** "Quartier, note" from the listing, offered first. */
  listingPlace?: string | null;
}

export default function MeetingSheet({ visible, onClose, txn, listingPlace }: MeetingSheetProps) {
  const qc = useQueryClient();
  const [place, setPlace] = useState('');
  const [day, setDay] = useState<number | null>(null); // offset from today
  const [hour, setHour] = useState<number | null>(null); // minutes since midnight
  const [now, setNow] = useState(() => new Date());

  // Prefill from the current meeting each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const n = new Date();
    setNow(n);
    setPlace(txn.meeting_location ?? '');
    const at = parseServerDate(txn.meeting_at);
    if (at && at.getTime() > n.getTime()) {
      const offset = Math.round((dayStart(at).getTime() - dayStart(n).getTime()) / 86400000);
      setDay(offset >= 0 && offset < DAYS_AHEAD ? offset : null);
      setHour(at.getHours() * 60 + at.getMinutes());
    } else {
      setDay(null);
      setHour(null);
    }
  }, [visible, txn.meeting_location, txn.meeting_at]);

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = dayStart(now);
        d.setDate(d.getDate() + i);
        return { offset: i, label: dayLabel(i, d) };
      }),
    [now],
  );
  const hours = useMemo(() => {
    const list = HOURS.map((h) => h * 60);
    // Keep an existing odd time (e.g. 18 h 30) selectable.
    if (hour != null && !list.includes(hour)) list.push(hour);
    return list.sort((a, b) => a - b);
  }, [hour]);

  const isPast = (dOffset: number | null, mins: number) =>
    dOffset === 0 && mins <= now.getHours() * 60 + now.getMinutes();

  const when = useMemo(() => {
    if (day == null || hour == null) return null;
    const d = dayStart(now);
    d.setDate(d.getDate() + day);
    d.setMinutes(hour);
    return d;
  }, [day, hour, now]);

  const hadMeeting = !!txn.meeting_location || !!txn.meeting_at;
  const trimmed = place.trim();
  const halfTime = (day == null) !== (hour == null);
  const timeInPast = day != null && hour != null && isPast(day, hour);
  const nothing = !trimmed && !when;

  const mut = useMutation({
    mutationFn: (clear: boolean) =>
      updateMeeting(
        txn.id,
        clear
          ? { meeting_location: null, meeting_at: null }
          : { meeting_location: trimmed || null, meeting_at: when ? when.toISOString() : null },
      ),
    onSuccess: (next, clear) => {
      qc.setQueryData<BdTransaction>(['transaction', txn.id], (old) => ({ ...old, ...next }));
      qc.invalidateQueries({ queryKey: ['transaction', txn.id] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['conversation'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      haptics.success();
      showToast.success(clear ? 'Rendez-vous retiré' : 'Rendez-vous enregistré', 'L’autre partie est prévenue dans la conversation.');
      onClose();
    },
    onError: (e) => showToast.error('Rendez-vous', meetingErrorMessage(e)),
  });

  const disabledReason = halfTime
    ? 'Choisissez le jour et l’heure, ou aucun des deux.'
    : timeInPast
      ? 'Cette heure est déjà passée.'
      : nothing
        ? 'Indiquez un lieu ou une heure.'
        : undefined;

  const suggestions = [listingPlace, ...PLACE_SUGGESTIONS].filter((x): x is string => !!x && !!x.trim());

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={hadMeeting ? 'Modifier le rendez-vous' : 'Fixer un rendez-vous'}
      maxHeight="92%"
      footer={
        <View style={styles.footer}>
          <Button
            label="Enregistrer"
            icon="checkmark"
            onPress={() => mut.mutate(false)}
            loading={mut.isPending && mut.variables === false}
            disabled={!!disabledReason || mut.isPending}
            disabledReason={disabledReason}
            fullWidth
          />
          {hadMeeting && (
            <Button
              label="Retirer le rendez-vous"
              variant="ghost"
              onPress={() => mut.mutate(true)}
              loading={mut.isPending && mut.variables === true}
              disabled={mut.isPending}
              fullWidth
            />
          )}
        </View>
      }>
      <AppText variant="labelStrong" style={styles.label}>
        Lieu
      </AppText>
      <TextField
        label="Où vous retrouver ?"
        placeholder="Ex. : devant la pharmacie du carrefour"
        value={place}
        onChangeText={setPlace}
        maxLength={200}
        helper="Un lieu public et fréquenté, de jour si possible."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {suggestions.map((s) => (
          <Chip key={s} kind="choice" label={s} selected={trimmed === s} onPress={() => setPlace(s)} />
        ))}
      </ScrollView>

      <AppText variant="labelStrong" style={[styles.label, styles.gap]}>
        Jour
      </AppText>
      <View style={styles.wrap} accessibilityLabel="Jour du rendez-vous">
        {days.map((d) => (
          <Chip
            key={d.offset}
            kind="choice"
            label={d.label}
            selected={day === d.offset}
            onPress={() => setDay(day === d.offset ? null : d.offset)}
          />
        ))}
      </View>

      <AppText variant="labelStrong" style={[styles.label, styles.gap]}>
        Heure
      </AppText>
      <View style={styles.wrap} accessibilityLabel="Heure du rendez-vous">
        {hours.map((m) => (
          <Chip
            key={m}
            kind="choice"
            label={`${Math.floor(m / 60)} h${m % 60 ? ` ${pad2(m % 60)}` : ''}`}
            selected={hour === m}
            disabled={isPast(day, m)}
            onPress={() => setHour(hour === m ? null : m)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  footer: { gap: 4 },
  label: { marginBottom: 8 },
  gap: { marginTop: 20 },
  chips: { gap: 8, paddingTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

/**
 * Propose or change an appointment (docs/14 §8). Time is required: day chips
 * (two weeks) and hour chips, no native picker. The place is optional: a known
 * place (name + details, the usual way to meet in Libreville), an exact
 * address, or "Plus tard" to settle it in the chat. The other party confirms.
 */
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  appointmentErrorMessage,
  isStaleAppointmentError,
  proposeAppointment,
  updateAppointment,
  type BdAppointment,
  type BdAppointmentPlace,
} from '@/lib/api/appointments';
import { parseServerDate } from '@/lib/api/transactions';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import Chip from '../atoms/Chip';
import TextField from '../atoms/TextField';
import { showToast } from '../atoms/Toast';
import SegmentedControl from '../molecules/SegmentedControl';
import Sheet from './Sheet';

/** Generic public places: busy, visible, and found in every quartier. */
const PLACE_SUGGESTIONS = [
  'Devant la pharmacie',
  'Station-service',
  'Entrée du supermarché',
  'Au marché',
  'Rond-point du quartier',
];

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DAYS_AHEAD = 14;
const LATE_HOUR = 19;
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const pad2 = (n: number) => String(n).padStart(2, '0');

function dayLabel(offset: number, d: Date): string {
  if (offset === 0) return 'Aujourd’hui';
  if (offset === 1) return 'Demain';
  return `${WEEKDAYS[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

type PlaceMode = 'relative' | 'exact' | 'later';

export interface AppointmentSheetProps {
  visible: boolean;
  onClose: () => void;
  conversationId: number;
  /** The open appointment to change; null to propose a new one. */
  appointment: BdAppointment | null;
  /** "Quartier, note" from the listing, offered first. */
  listingPlace?: string | null;
}

export default function AppointmentSheet({
  visible,
  onClose,
  conversationId,
  appointment,
  listingPlace,
}: AppointmentSheetProps) {
  const t = useTheme();
  const qc = useQueryClient();
  const [mode, setMode] = useState<PlaceMode>('relative');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState('');
  const [day, setDay] = useState<number | null>(null); // offset from today
  const [hour, setHour] = useState<number | null>(null); // minutes since midnight
  const [now, setNow] = useState(() => new Date());

  // Prefill from the appointment being changed, each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const n = new Date();
    setNow(n);
    const p = appointment?.place;
    setMode(p ? p.kind : appointment ? 'later' : 'relative');
    setName(p?.kind === 'relative' ? p.name : '');
    setAddress(p?.kind === 'exact' ? p.address : '');
    setDetails(p?.details ?? '');
    const at = parseServerDate(appointment?.starts_at);
    if (at && at.getTime() > n.getTime()) {
      const offset = Math.round((dayStart(at).getTime() - dayStart(n).getTime()) / 86400000);
      setDay(offset >= 0 && offset < DAYS_AHEAD ? offset : null);
      setHour(at.getHours() * 60 + at.getMinutes());
    } else {
      setDay(null);
      setHour(null);
    }
  }, [visible, appointment]);

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

  const place: BdAppointmentPlace | null =
    mode === 'relative' && name.trim()
      ? { kind: 'relative', name: name.trim(), details: details.trim() || null }
      : mode === 'exact' && address.trim()
        ? { kind: 'exact', address: address.trim(), details: details.trim() || null }
        : null;

  const disabledReason =
    day == null || hour == null
      ? 'Choisissez le jour et l’heure.'
      : isPast(day, hour)
        ? 'Cette heure est déjà passée.'
        : mode === 'relative' && !name.trim()
          ? 'Indiquez le lieu, ou choisissez « Plus tard ».'
          : mode === 'exact' && !address.trim()
            ? 'Indiquez l’adresse, ou choisissez « Plus tard ».'
            : undefined;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['appointment', conversationId] });
    qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
  };

  const mut = useMutation({
    mutationFn: () => {
      const body = { starts_at: when!.toISOString(), place };
      return appointment ? updateAppointment(appointment, body) : proposeAppointment(conversationId, body);
    },
    onSuccess: (next) => {
      qc.setQueryData(['appointment', conversationId], next);
      refresh();
      haptics.success();
      showToast.success(
        appointment ? 'Rendez-vous modifié' : 'Rendez-vous proposé',
        'L’autre partie est prévenue et doit le confirmer.',
      );
      onClose();
    },
    onError: (e) => {
      showToast.error('Rendez-vous', appointmentErrorMessage(e));
      if (isStaleAppointmentError(e)) {
        refresh();
        onClose();
      }
    },
  });

  const suggestions = [listingPlace, ...PLACE_SUGGESTIONS].filter((x): x is string => !!x && !!x.trim());
  const late = hour != null && hour >= LATE_HOUR * 60;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={appointment ? 'Modifier le rendez-vous' : 'Proposer un rendez-vous'}
      maxHeight="92%"
      footer={
        <Button
          label={appointment ? 'Envoyer la modification' : 'Proposer ce rendez-vous'}
          icon="calendar-outline"
          onPress={() => mut.mutate()}
          loading={mut.isPending}
          disabled={!!disabledReason || mut.isPending}
          disabledReason={disabledReason}
          fullWidth
        />
      }>
      <AppText variant="labelStrong" style={styles.label}>
        Jour
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {days.map((d) => (
          <Chip
            key={d.offset}
            kind="choice"
            label={d.label}
            selected={day === d.offset}
            onPress={() => setDay(day === d.offset ? null : d.offset)}
          />
        ))}
      </ScrollView>

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
      {late && (
        <AppText variant="small" color="warning" style={styles.note}>
          Le soir, choisissez un lieu bien éclairé et fréquenté.
        </AppText>
      )}

      <AppText variant="labelStrong" style={[styles.label, styles.gap]}>
        Lieu
      </AppText>
      <SegmentedControl
        accessibilityLabel="Type de lieu"
        segments={[
          { value: 'relative', label: 'Lieu connu' },
          { value: 'exact', label: 'Adresse' },
          { value: 'later', label: 'Plus tard' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'relative' && (
        <View style={styles.fields}>
          <TextField
            label="Nom du lieu"
            placeholder="Ex. : Rond-point de Louis"
            value={name}
            onChangeText={setName}
            maxLength={120}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled">
            {suggestions.map((s) => (
              <Chip key={s} kind="choice" label={s} selected={name.trim() === s} onPress={() => setName(s)} />
            ))}
          </ScrollView>
        </View>
      )}
      {mode === 'exact' && (
        <View style={styles.fields}>
          <TextField
            label="Adresse"
            placeholder="Ex. : 12 rue Ange Mba, Akébé"
            value={address}
            onChangeText={setAddress}
            maxLength={200}
          />
        </View>
      )}
      {mode !== 'later' ? (
        <View style={styles.fields}>
          <TextField
            label="Précisions (facultatif)"
            placeholder="Ex. : devant la pharmacie, portail bleu"
            value={details}
            onChangeText={setDetails}
            maxLength={200}
          />
        </View>
      ) : (
        <AppText variant="small" color="inkMuted" style={styles.note}>
          Vous pourrez préciser le lieu plus tard ou dans la conversation.
        </AppText>
      )}

      <View style={[styles.safety, { backgroundColor: t.colors.trustTint, borderRadius: t.radius.sm }]}>
        <Ionicons name="shield-checkmark" size={18} color={t.colors.trust} />
        <AppText variant="caption" color="inkMuted" style={styles.flex}>
          Rencontrez-vous dans un lieu public. Vérifiez l’article avant de payer, jamais d’avance.
        </AppText>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
  gap: { marginTop: 20 },
  chips: { gap: 8, paddingTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fields: { marginTop: 12, gap: 4 },
  note: { marginTop: 8 },
  safety: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 20 },
  flex: { flex: 1 },
});

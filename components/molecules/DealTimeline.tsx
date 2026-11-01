/**
 * Where a deal stands (audit S7): Accord → Échange → Avis, derived
 * from the transaction status and whether I've reviewed. A cancelled deal
 * stops at "Échange", a disputed one at "Avis" (disputes follow completion).
 * Static on purpose: state, not celebration.
 * `vertical` is the deal page's frise (docs/11 §4.2): longer labels and one
 * detail line per step, given by the host.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BdTransactionStatus } from '@/constants/types';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';

type StepState = 'done' | 'current' | 'todo' | 'stopped';

interface Step {
  label: string;
  /** Vertical layout label ("Remise en main propre"). */
  longLabel: string;
  state: StepState;
}

export function dealSteps(status: BdTransactionStatus | string, reviewed: boolean): Step[] {
  const exchange: StepState =
    status === 'completed' || status === 'disputed' ? 'done' : status === 'cancelled' ? 'stopped' : 'current';
  const review: StepState =
    status === 'disputed'
      ? 'stopped'
      : status === 'completed'
        ? reviewed
          ? 'done'
          : 'current'
        : 'todo';
  return [
    // An accepted offer or a confirmed appointment (docs/14): both are an agreement.
    { label: 'Accord', longLabel: 'Accord conclu', state: 'done' },
    {
      label: status === 'cancelled' ? 'Annulée' : 'Échange',
      longLabel: status === 'cancelled' ? 'Affaire annulée' : 'Remise en main propre',
      state: exchange,
    },
    {
      label: status === 'disputed' ? 'Litige' : 'Avis',
      longLabel: status === 'disputed' ? 'Litige ouvert' : reviewed ? 'Avis envoyé' : 'Laisser un avis',
      state: review,
    },
  ];
}

export interface DealTimelineProps {
  status: BdTransactionStatus | string;
  reviewed: boolean;
  /** Stacked steps with a detail line each (deal page). */
  vertical?: boolean;
  /** Vertical only: one secondary line per step (date, advice…). */
  details?: (string | null | undefined)[];
}

export default function DealTimeline({ status, reviewed, vertical, details }: DealTimelineProps) {
  const t = useTheme();
  const steps = dealSteps(status, reviewed);
  const at = steps.findIndex((s) => s.state === 'current' || s.state === 'stopped');
  const a11y =
    at === -1
      ? 'Toutes les étapes sont terminées'
      : `Étape ${at + 1} sur ${steps.length} : ${steps[at].label}`;

  const tone = (s: StepState) =>
    s === 'done' ? t.colors.success : s === 'current' ? t.colors.brandStrong : s === 'stopped' ? t.colors.danger : t.colors.line;

  const dot = (s: Step) => (
    <View
      style={[
        styles.dot,
        s.state === 'done' || s.state === 'stopped'
          ? { backgroundColor: tone(s.state) }
          : { borderWidth: 2, borderColor: tone(s.state), backgroundColor: t.colors.surface },
      ]}>
      {s.state === 'done' && <Ionicons name="checkmark" size={12} color={t.colors.surface} />}
      {s.state === 'stopped' && <Ionicons name="close" size={12} color={t.colors.surface} />}
      {s.state === 'current' && <View style={[styles.core, { backgroundColor: t.colors.brandStrong }]} />}
    </View>
  );

  if (vertical) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel={a11y} style={styles.vWrap}>
        {steps.map((s, i) => {
          const detail = details?.[i];
          const last = i === steps.length - 1;
          return (
            <View key={i} style={styles.vStep}>
              <View style={styles.vRail}>
                {dot(s)}
                {!last && (
                  <View
                    style={[
                      styles.vLine,
                      { backgroundColor: s.state === 'done' && steps[i + 1].state !== 'todo' ? t.colors.success : t.colors.line },
                    ]}
                  />
                )}
              </View>
              <View style={[styles.vText, !last && styles.vTextGap]}>
                <AppText variant="labelStrong" color={s.state === 'todo' ? 'inkSubtle' : s.state === 'stopped' ? 'danger' : 'ink'}>
                  {s.longLabel}
                </AppText>
                {!!detail && (
                  <AppText variant="caption" color="inkMuted">
                    {detail}
                  </AppText>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={a11y} style={styles.wrap}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <View
              style={[
                styles.line,
                { backgroundColor: steps[i - 1].state === 'done' && s.state !== 'todo' ? t.colors.success : t.colors.line },
              ]}
            />
          )}
          <View style={styles.step}>
            {dot(s)}
            <AppText
              variant={s.state === 'current' ? 'captionStrong' : 'caption'}
              color={s.state === 'todo' ? 'inkSubtle' : s.state === 'current' ? 'ink' : 'inkMuted'}
              numberOfLines={1}>
              {s.label}
            </AppText>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  step: { alignItems: 'center', gap: 4, minWidth: 64 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  core: { width: 8, height: 8, borderRadius: 4 },
  line: { flex: 1, height: 2, marginTop: 9, marginHorizontal: -20, borderRadius: 1 },
  vWrap: { paddingVertical: 4 },
  vStep: { flexDirection: 'row', gap: 12 },
  vRail: { alignItems: 'center', width: 20 },
  vLine: { flex: 1, width: 2, minHeight: 20, marginVertical: 2, borderRadius: 1 },
  vText: { flex: 1, gap: 2, paddingTop: 1 },
  vTextGap: { paddingBottom: 16 },
});

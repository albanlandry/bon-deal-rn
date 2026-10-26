import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { BdPriceCheck } from '@/constants/types';
import { formatAmount } from '@/lib/format';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import Card from '../atoms/Card';

const VERDICT = {
  bonne_affaire: { label: 'Bonne affaire', tone: 'success' as const },
  prix_correct: { label: 'Prix correct', tone: 'ink' as const },
  trop_cher: { label: 'Prix au-dessus du marché', tone: 'warning' as const },
};

function confidenceLabel(c: number): string {
  if (c >= 0.7) return 'Avis fiable';
  if (c >= 0.4) return 'Avis indicatif';
  return 'À prendre avec prudence';
}

/** "Bon prix ?" ephemeral verdict (anchoring with real comparables only). */
export default function ItemPriceCheckCard({ check, onDismiss }: { check: BdPriceCheck; onDismiss: () => void }) {
  const t = useTheme();
  const meta = VERDICT[check.verdict];
  const m = check.market;
  const span = m ? m.range_max - m.range_min : 0;
  const pos = m ? Math.min(Math.max(span > 0 ? (check.listed_price - m.range_min) / span : 0.5, 0), 1) : 0.5;
  const delta =
    check.delta_pct != null ? ` · ${check.delta_pct > 0 ? '+' : ''}${Math.round(check.delta_pct)} % vs marché` : '';
  return (
    <Card tone="muted" style={styles.card}>
      <View style={styles.row}>
        <AppText variant="labelStrong">Bon prix ?</AppText>
        <AppText variant="caption" color="inkMuted">
          Visible par vous seul
        </AppText>
      </View>
      <AppText variant="h3" color={meta.tone}>
        {meta.label}
      </AppText>
      <AppText variant="small" color="inkMuted">
        {check.rationale_fr}
      </AppText>
      {m ? (
        <>
          <AppText variant="caption" color="inkMuted">
            Marché : {formatAmount(m.range_min)} – {formatAmount(m.range_max)} · {m.comparable_count} annonce
            {m.comparable_count > 1 ? 's' : ''} similaire{m.comparable_count > 1 ? 's' : ''}
            {delta}
          </AppText>
          <View style={[styles.track, { backgroundColor: t.colors.line }]}>
            <View style={[styles.dot, { left: `${pos * 100}%`, backgroundColor: t.colors.brandStrong, borderColor: t.colors.surface }]} />
          </View>
        </>
      ) : (
        <AppText variant="caption" color="inkMuted">
          Peu d’annonces similaires — avis basé sur l’annonce elle-même
        </AppText>
      )}
      {check.condition_flags_fr.map((f, i) => (
        <AppText key={i} variant="caption" color="warning">
          ⚠ {f}
        </AppText>
      ))}
      {!!check.warning && (
        <AppText variant="caption" color="warning">
          {check.warning}
        </AppText>
      )}
      <View style={styles.row}>
        <AppText variant="caption" color="inkMuted">
          {confidenceLabel(check.confidence)}
        </AppText>
        <Button label="Fermer" variant="ghost" size="sm" onPress={onDismiss} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, marginVertical: 8 },
  dot: { position: 'absolute', top: -5, width: 16, height: 16, marginLeft: -8, borderRadius: 8, borderWidth: 2 },
});

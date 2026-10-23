/**
 * Home quick filters (docs/12 "filtres rapides collants"): Récent · Gratuit ·
 * < 50 000 F as one single choice, plus "Près de moi" as a toggle for the
 * feed scope. No "Pour vous": there is no personalisation behind it.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Chip from '../atoms/Chip';

export type QuickFilter = 'recent' | 'free' | 'cheap';

export const CHEAP_MAX_PRICE = 50_000;

const OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: 'recent', label: 'Récent' },
  { value: 'free', label: 'Gratuit' },
  { value: 'cheap', label: '<\u00A050\u202F000\u00A0F' },
];

export interface QuickFilterRowProps {
  value: QuickFilter;
  onChange: (v: QuickFilter) => void;
  near: boolean;
  onToggleNear: () => void;
  locating?: boolean;
}

export default function QuickFilterRow({ value, onChange, near, onToggleNear, locating }: QuickFilterRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Filtres rapides">
      {OPTIONS.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={value === o.value}
          kind="choice"
          onPress={() => onChange(o.value)}
        />
      ))}
      <Chip
        label={locating ? 'Localisation…' : 'Près de moi'}
        icon="navigate-outline"
        selected={near}
        kind="filter"
        disabled={locating}
        onPress={onToggleNear}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});

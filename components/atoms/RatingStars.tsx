import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from './AppText';

export interface RatingStarsProps {
  value: number | null | undefined;
  count?: number | null;
  size?: number;
  showValue?: boolean;
  /** When set, stars become an input (1–5). */
  onChange?: (v: number) => void;
}

export default function RatingStars({ value, count, size = 14, showValue = true, onChange }: RatingStarsProps) {
  const t = useTheme();
  const v = value ?? 0;
  const star = (i: number) => {
    const name = v >= i ? 'star' : v >= i - 0.5 ? 'star-half' : 'star-outline';
    const icon = <Ionicons name={name as any} size={size} color={t.colors.warning} />;
    if (!onChange) return <View key={i}>{icon}</View>;
    return (
      <Pressable
        key={i}
        accessibilityRole="button"
        accessibilityLabel={`${i} étoile${i > 1 ? 's' : ''}`}
        onPress={() => onChange(i)}
        style={styles.input}>
        {icon}
      </Pressable>
    );
  };
  return (
    <View
      style={styles.row}
      accessibilityLabel={
        onChange ? undefined : value != null ? `Note ${v.toFixed(1)} sur 5${count ? `, ${count} avis` : ''}` : undefined
      }>
      {[1, 2, 3, 4, 5].map(star)}
      {showValue && value != null && (
        <AppText variant="captionStrong" color="ink" style={styles.value}>
          {v.toFixed(1).replace('.', ',')}
        </AppText>
      )}
      {count != null && count > 0 && (
        <AppText variant="caption" color="inkMuted">
          ({count} avis)
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  value: { marginLeft: 4 },
  input: { padding: 6 },
});

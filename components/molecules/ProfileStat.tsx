import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Card from '../atoms/Card';
import CountUp from '../motion/CountUp';

export interface ProfileStatProps {
  /** Real number only (never invented). Strings are shown as-is. */
  value: number | string;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
}

/**
 * One real-number stat tile on the profile. Numbers count up on first view
 * (docs/09 §4 Profile — the user's own stats only, never prices).
 */
export default function ProfileStat({ value, label, icon, onPress }: ProfileStatProps) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${value} ${label}`}>
      {icon && (
        <View style={[styles.icon, { backgroundColor: t.colors.brandTint }]}>
          <Ionicons name={icon} size={16} color={t.colors.brandStrong} />
        </View>
      )}
      {typeof value === 'number' ? (
        <CountUp value={value} variant="h2" align="center" />
      ) : (
        <AppText variant="h2" align="center">
          {value}
        </AppText>
      )}
      <AppText variant="caption" color="inkMuted" align="center" numberOfLines={1}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, gap: 4 },
  icon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});

import React from 'react';
import { StyleSheet } from 'react-native';
import AppText from '../atoms/AppText';
import Card from '../atoms/Card';

export interface ProfileStatProps {
  value: string;
  label: string;
  onPress?: () => void;
}

/** One real-number stat tile on the profile (never pass invented counts). */
export default function ProfileStat({ value, label, onPress }: ProfileStatProps) {
  return (
    <Card onPress={onPress} style={styles.tile} accessibilityLabel={`${value} ${label}`}>
      <AppText variant="h2" align="center">
        {value}
      </AppText>
      <AppText variant="caption" color="inkMuted" align="center" numberOfLines={1}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
});

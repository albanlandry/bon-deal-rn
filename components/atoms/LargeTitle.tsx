// components/atoms/LargeTitle.tsx — large left-aligned screen title
// (docs/12): 30/800, tight tracking, with an optional caption line.
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { font } from '@/theme';
import AppText from './AppText';

export interface LargeTitleProps {
  title: string;
  subtitle?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function LargeTitle({ title, subtitle, style }: LargeTitleProps) {
  return (
    <View style={style}>
      <AppText variant="h1" numberOfLines={2} accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {typeof subtitle === 'string' ? (
        <AppText variant="small" color="inkMuted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : (
        subtitle
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...font('800'), fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  subtitle: { marginTop: 2 },
});

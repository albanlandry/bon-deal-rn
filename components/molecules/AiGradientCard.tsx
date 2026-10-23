/**
 * Soft-gradient surface for the AI entry points ("Trouve-moi ça"). Direction
 * B (docs/11): the AI accent is teal, so the surface runs trust tint → brand
 * tint, 12 px corners with a hairline border. Uses expo-linear-gradient when
 * its native module is present, else a flat trust tint. Text on it stays ink
 * (AA in both schemes).
 */
import { requireOptionalNativeModule } from 'expo';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

let LinearGradient: any = null;
try {
  if (requireOptionalNativeModule('ExpoLinearGradient')) {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
  }
} catch {
  LinearGradient = null;
}

export default function AiGradientCard({
  children,
  style,
  compact,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Tighter padding and card radius, for a secondary entry point. */
  compact?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: t.radius.md, backgroundColor: t.colors.trustTint, borderColor: t.colors.line },
        style,
      ]}>
      {LinearGradient && (
        <LinearGradient
          colors={[t.colors.trustTint, t.colors.brandTint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[styles.inner, compact && styles.compact]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderWidth: 1 },
  inner: { padding: 16, gap: 8 },
  compact: { padding: 12, gap: 8 },
});

/**
 * Soft-gradient surface for the AI entry points ("Trouve-moi ça"). Uses
 * expo-linear-gradient when its native module is present, else a flat
 * brand tint. Text on it stays ink (AA in both schemes).
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

export default function AiGradientCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { borderRadius: t.radius.lg, backgroundColor: t.colors.brandTint }, style]}>
      {LinearGradient && (
        <LinearGradient
          colors={[t.colors.brandTint, t.colors.trustTint]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  inner: { padding: 16, gap: 8 },
});

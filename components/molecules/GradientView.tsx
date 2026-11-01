/**
 * Linear gradient fill that degrades gracefully: uses expo-linear-gradient
 * when its native module is in the dev client, else a flat `fallback` colour
 * (same pattern as AiGradientCard). Absolute-fill by default, so it sits
 * behind or over content (photo scrims, the "Trouve-moi ça" card).
 */
import { requireOptionalNativeModule } from 'expo';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

let LinearGradient: any = null;
try {
  if (requireOptionalNativeModule('ExpoLinearGradient')) {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
  }
} catch {
  LinearGradient = null;
}

export const hasNativeGradient = (): boolean => LinearGradient != null;

export interface GradientViewProps {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  /** Flat colour when the native module is missing. */
  fallback: string;
  style?: StyleProp<ViewStyle>;
}

export default function GradientView({ colors, locations, start, end, fallback, style }: GradientViewProps) {
  const fill = [StyleSheet.absoluteFill, style];
  if (!LinearGradient) return <View pointerEvents="none" style={[fill, { backgroundColor: fallback }]} />;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      locations={locations}
      start={start}
      end={end}
      style={fill}
    />
  );
}

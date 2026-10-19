import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';

export interface StepperProps {
  steps: string[];
  current: number; // 0-based
}

/** Visible progress through a short flow (goal-gradient). */
export default function Stepper({ steps, current }: StepperProps) {
  const t = useTheme();
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${current + 1} sur ${steps.length} : ${steps[current]}`}>
      <View style={styles.row}>
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <React.Fragment key={label}>
              <View style={styles.step}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: done || active ? t.colors.brand : t.colors.surface,
                      borderColor: done || active ? t.colors.brand : t.colors.line,
                    },
                  ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={t.colors.onBrand} />
                  ) : (
                    <AppText variant="captionStrong" style={{ color: active ? t.colors.onBrand : t.colors.inkMuted }}>
                      {i + 1}
                    </AppText>
                  )}
                </View>
                <AppText
                  variant="caption"
                  color={active ? 'ink' : 'inkMuted'}
                  style={active ? styles.activeLabel : undefined}
                  numberOfLines={1}>
                  {label}
                </AppText>
              </View>
              {i < steps.length - 1 && (
                <View
                  style={[styles.bar, { backgroundColor: i < current ? t.colors.brand : t.colors.line }]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', gap: 4, width: 72 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  bar: { flex: 1, height: 2, marginTop: 12, marginHorizontal: -18, borderRadius: 1 },
  activeLabel: { fontWeight: '600' },
});

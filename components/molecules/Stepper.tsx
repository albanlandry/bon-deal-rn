import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { font, useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import ProgressBar from '../motion/ProgressBar';
import { enterFade } from '../motion/anim';

export interface StepperProps {
  steps: string[];
  current: number; // 0-based
}

/**
 * Visible progress through a short flow (goal-gradient, docs/09 §4 Sell): a
 * spring-filled bar that fills step by step, with the step names under it
 * (done ✓, current bold).
 */
export default function Stepper({ steps, current }: StepperProps) {
  const t = useTheme();
  const n = steps.length;
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${current + 1} sur ${n} : ${steps[current]}`}
      accessibilityValue={{ min: 1, max: n, now: current + 1 }}>
      <View style={styles.head}>
        <AppText variant="captionStrong" color="inkMuted">
          Étape {current + 1} sur {n}
        </AppText>
        <Animated.View key={current} entering={enterFade()}>
          <AppText variant="captionStrong" color="ink">
            {steps[current]}
          </AppText>
        </Animated.View>
      </View>
      <ProgressBar progress={(current + 1) / n} height={6} />
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <View key={label} style={styles.step}>
              {done && <Ionicons name="checkmark" size={12} color={t.colors.success} />}
              <AppText
                variant="caption"
                color={active ? 'ink' : 'inkMuted'}
                style={active ? styles.activeLabel : undefined}
                numberOfLines={1}>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row' },
  step: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  activeLabel: font('600'),
});

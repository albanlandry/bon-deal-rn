import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';

export interface SellLaborStepsProps {
  /** Labels shown one after another while the real request runs. */
  steps: string[];
  /** True while the underlying API call is pending. */
  running: boolean;
  /** True once the call has succeeded (all steps get a check). */
  done: boolean;
  /** Pace between visible steps (ms). The last step waits for the real result. */
  stepMs?: number;
}

/**
 * Labor illusion (Buell & Norton 2011): show the work behind the AI result
 * instead of a bare spinner. Steps advance on a timer while the request is in
 * flight, but the final step only completes when the real call resolves.
 */
export default function SellLaborSteps({ steps, running, done, stepMs = 1300 }: SellLaborStepsProps) {
  const t = useTheme();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!running) return;
    setIndex(0);
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    }, stepMs);
    return () => clearInterval(id);
  }, [running, steps.length, stepMs]);

  if (!running && !done) return null;

  return (
    <View
      style={[styles.wrap, { backgroundColor: t.colors.brandTint, borderRadius: t.radius.md }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={done ? 'Analyse terminée' : steps[index]}>
      {steps.map((label, i) => {
        const complete = done || i < index;
        const active = !done && i === index;
        if (!done && i > index) return null;
        return (
          <Animated.View
            key={label}
            entering={t.reduceMotion ? undefined : FadeIn.duration(t.motion.enter)}
            style={styles.row}>
            {complete ? (
              <Ionicons name="checkmark-circle" size={20} color={t.colors.success} />
            ) : active ? (
              <ActivityIndicator size="small" color={t.colors.brandStrong} />
            ) : null}
            <AppText variant="label" color={complete ? 'inkMuted' : 'ink'}>
              {label}
            </AppText>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import AppText from '../atoms/AppText';
import ProgressBar from '../motion/ProgressBar';
import { enterUp, RM } from '../motion/anim';

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

/** 0..1 progress for the bar: the last share is only given by the real result. */
export function laborProgress(index: number, total: number, done: boolean): number {
  if (done) return 1;
  if (total <= 0) return 0;
  return Math.min(index + 0.5, total - 0.25) / total;
}

/**
 * Labor illusion (Buell & Norton 2011): show the work behind the AI result
 * instead of a bare spinner (docs/09 §4 Sell step 2). A progress bar fills
 * and a checklist ticks one by one while the request is in flight; the final
 * step only completes when the real call resolves.
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
    <Animated.View
      entering={enterUp(0)}
      style={[styles.wrap, { backgroundColor: t.colors.brandTint, borderRadius: t.radius.md }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={done ? 'Analyse terminée' : steps[index]}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={16} color={t.colors.brandStrong} />
        <AppText variant="labelStrong" color="brandStrong" style={styles.flex}>
          {done ? 'Votre annonce est prête' : 'L’IA prépare votre annonce'}
        </AppText>
      </View>
      <ProgressBar progress={laborProgress(index, steps.length, done)} height={4} trackColor={t.colors.surface} />
      {steps.map((label, i) => {
        const complete = done || i < index;
        const active = !done && i === index;
        return (
          <View key={label} style={styles.row}>
            <View style={styles.mark}>
              {complete ? (
                <Animated.View entering={ZoomIn.duration(duration.short).reduceMotion(RM)}>
                  <Ionicons name="checkmark-circle" size={22} color={t.colors.success} />
                </Animated.View>
              ) : active ? (
                <ActivityIndicator size="small" color={t.colors.brandStrong} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={t.colors.inkSubtle} />
              )}
            </View>
            <AppText variant="label" color={active ? 'ink' : 'inkMuted'} style={styles.flex}>
              {label}
            </AppText>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 24 },
  mark: { width: 24, alignItems: 'center' },
  flex: { flex: 1 },
});

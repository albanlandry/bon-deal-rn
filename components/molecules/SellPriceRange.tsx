/**
 * Anchoring bar (docs/09 §4 Sell step 3): the comparables range drawn as a
 * band on a track, the suggestion as a marker, and the seller's own price as
 * a caret that follows the input (spring, translateX only).
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { formatAmount } from '@/lib/format';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import { spring } from '../motion/anim';
import { priceScale } from './sellGrid';

const MARK = 16;

export interface SellPriceRangeProps {
  min: number;
  max: number;
  suggested?: number | null;
  current?: number | null;
}

export default function SellPriceRange({ min, max, suggested, current }: SellPriceRangeProps) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const sc = priceScale(min, max);
  const sugX = useSharedValue(0);
  const curX = useSharedValue(0);
  const hasCur = current != null && current > 0;

  useEffect(() => {
    if (!w) return;
    if (suggested != null) sugX.value = spring(sc.pos(suggested) * w - MARK / 2, 'default');
  }, [w, suggested, min, max]);
  useEffect(() => {
    if (!w || !hasCur) return;
    curX.value = spring(sc.pos(current!) * w - 6, 'default');
  }, [w, current, min, max]);

  const sugStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sugX.value }] }));
  const curStyle = useAnimatedStyle(() => ({ transform: [{ translateX: curX.value }] }));
  const left = sc.pos(Math.min(min, max)) * 100;
  const right = sc.pos(Math.max(min, max)) * 100;
  const verdict =
    !hasCur ? null : current! < min ? 'Sous la fourchette : vente rapide' : current! > max ? 'Au-dessus de la fourchette' : 'Dans la fourchette';

  return (
    <View
      accessible
      accessibilityLabel={`Fourchette ${formatAmount(min)} à ${formatAmount(max)}${
        suggested != null ? `, prix conseillé ${formatAmount(suggested)}` : ''
      }${hasCur ? `, votre prix ${formatAmount(current!)}` : ''}`}
      style={styles.wrap}>
      <View style={styles.trackBox} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
        <View style={[styles.track, { backgroundColor: t.colors.surface }]} />
        <View
          style={[
            styles.band,
            { left: `${left}%`, width: `${Math.max(right - left, 2)}%`, backgroundColor: t.colors.brand },
          ]}
        />
        {suggested != null && !!w && (
          <Animated.View
            style={[styles.mark, { backgroundColor: t.colors.surface, borderColor: t.colors.brandStrong }, sugStyle]}
          />
        )}
        {hasCur && !!w && (
          <Animated.View style={[styles.caret, curStyle]}>
            <Ionicons name="caret-up" size={14} color={t.colors.ink} />
          </Animated.View>
        )}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" color="inkMuted">
          {formatAmount(min)}
        </AppText>
        <AppText variant="caption" color="inkMuted">
          {formatAmount(max)}
        </AppText>
      </View>
      {!!verdict && (
        <AppText variant="captionStrong" color="ink">
          ▲ Votre prix · {verdict}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 12 },
  trackBox: { height: 30, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4 },
  band: { position: 'absolute', top: 11, height: 8, borderRadius: 4 },
  mark: { position: 'absolute', left: 0, top: 7, width: MARK, height: MARK, borderRadius: MARK / 2, borderWidth: 3 },
  caret: { position: 'absolute', left: 0, top: 19 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});

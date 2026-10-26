import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { slotOffset } from '@/theme/motion';
import AppText from '../atoms/AppText';
import { spring } from '../motion/anim';
import PressableScale from '../motion/PressableScale';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}

const PAD = 4;

/**
 * Segmented control whose thumb slides between segments (spring.default).
 * Direction B: 10 px track, 8 px thumb with a hairline border, flat.
 */
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const n = Math.max(segments.length, 1);
  const segW = w ? (w - PAD * 2) / n : 0;
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const x = useSharedValue(-1);

  useEffect(() => {
    if (!segW) return;
    const to = slotOffset(index, segW, PAD);
    x.value = x.value < 0 ? to : spring(to, 'default');
  }, [index, segW, x]);

  const thumb = useAnimatedStyle(() => ({
    opacity: x.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(x.value, 0) }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[styles.wrap, { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.sm }]}>
      {!!segW && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            { width: segW, backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.xs },
            t.elevation.card as object,
            thumb,
          ]}
        />
      )}
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <PressableScale
            key={s.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            haptic={active ? false : 'selection'}
            onPress={() => {
              if (!active) onChange(s.value);
            }}
            style={[styles.seg, { borderRadius: t.radius.xs }]}>
            <AppText variant="labelStrong" color={active ? 'ink' : 'inkMuted'} numberOfLines={1}>
              {s.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: PAD },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: 0, borderWidth: 1 },
  seg: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});

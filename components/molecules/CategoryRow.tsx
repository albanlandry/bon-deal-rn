/**
 * One sticky row of category pills (docs/09 §4 Home, §5 mnemonics): each
 * pill shows its category's fixed icon in its fixed hue; a pill-shaped
 * indicator slides between them (spring.default) with a selection haptic.
 *
 * The indicator is built from two round caps + a middle bar so that only
 * transforms animate and the pill shape never distorts.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { categoryIcon, categoryMeta } from '@/constants/catalog';
import { categoryColors, useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import { spring } from '../motion/anim';
import PressableScale from '../motion/PressableScale';

const H = 40;
const BAR_BASE = 100;

export interface CategoryRowItem {
  /** Backend category value, or null for "Tout". */
  value: string | null;
  label?: string;
}

export interface CategoryRowProps {
  items: CategoryRowItem[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  /** Extra element after the pills (e.g. a "Plus" chip). */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export default function CategoryRow({ items, selected, onSelect, trailing, style, accessibilityLabel = 'Catégories' }: CategoryRowProps) {
  const t = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const scrollRef = useRef<ScrollView>(null);
  const x = useSharedValue(-1);
  const w = useSharedValue(H);
  const key = selected ?? '__all';
  const cur = layouts[key];

  useEffect(() => {
    if (!cur) return;
    if (x.value < 0) {
      x.value = cur.x;
      w.value = cur.w;
    } else {
      x.value = spring(cur.x, 'default');
      w.value = spring(cur.w, 'default');
    }
    scrollRef.current?.scrollTo({ x: Math.max(0, cur.x - 48), animated: !t.reduceMotion });
  }, [cur?.x, cur?.w]);

  const onItemLayout = useCallback((k: string, e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[k]?.x === lx && prev[k]?.w === width ? prev : { ...prev, [k]: { x: lx, w: width } }));
  }, []);

  const leftCap = useAnimatedStyle(() => ({ opacity: x.value < 0 ? 0 : 1, transform: [{ translateX: x.value }] }));
  const rightCap = useAnimatedStyle(() => ({
    opacity: x.value < 0 ? 0 : 1,
    transform: [{ translateX: x.value + w.value - H }],
  }));
  const bar = useAnimatedStyle(() => ({
    opacity: x.value < 0 ? 0 : 1,
    transform: [
      { translateX: x.value + H / 2 + (w.value - H) / 2 - BAR_BASE / 2 },
      { scaleX: Math.max(w.value - H, 0) / BAR_BASE },
    ],
  }));
  const ind = t.colors.ink;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={[styles.content, style]}>
      <View style={styles.track}>
        <Animated.View pointerEvents="none" style={[styles.cap, { backgroundColor: ind }, leftCap]} />
        <Animated.View pointerEvents="none" style={[styles.bar, { backgroundColor: ind }, bar]} />
        <Animated.View pointerEvents="none" style={[styles.cap, { backgroundColor: ind }, rightCap]} />
        {items.map((it) => {
          const k = it.value ?? '__all';
          const active = selected === it.value;
          const c = categoryColors(t.colors, it.value ?? 'all');
          const label = it.label ?? (it.value ? categoryMeta(it.value).label : 'Tout');
          return (
            <PressableScale
              key={k}
              onLayout={(e) => onItemLayout(k, e)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              haptic="selection"
              onPress={() => onSelect(it.value)}
              hitSlop={{ top: 4, bottom: 4 }}
              style={[
                styles.pill,
                { borderColor: active ? 'transparent' : t.colors.line, backgroundColor: active ? 'transparent' : t.colors.surface },
              ]}>
              <View style={[styles.dot, { backgroundColor: active ? 'transparent' : c.tint }]}>
                <Ionicons
                  name={categoryIcon(it.value ?? 'all', active) as any}
                  size={16}
                  color={active ? t.colors.surface : c.hue}
                />
              </View>
              <AppText variant="labelStrong" numberOfLines={1} style={{ color: active ? t.colors.surface : t.colors.ink }}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
        {trailing}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 6 },
  track: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cap: { position: 'absolute', left: 0, top: 0, width: H, height: H, borderRadius: H / 2 },
  bar: { position: 'absolute', left: 0, top: 0, width: BAR_BASE, height: H },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: H,
    paddingLeft: 4,
    paddingRight: 14,
    borderRadius: H / 2,
    borderWidth: 1,
  },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

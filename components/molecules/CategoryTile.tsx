/**
 * Category tile (docs/11 §3.4, direction B): a 56 px rounded square (12 px
 * radius) in the category's 12 % tint with its fixed icon in its fixed hue
 * (docs/09 §5 mnemonics), the label under it in ink. Used as a row on Home
 * and as a 4 × 2 grid on Search. Scales under the thumb (PressableScale).
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { categoryIcon } from '@/constants/catalog';
import { categoryColors, useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import PressableScale from '../motion/PressableScale';

const TILE = 56;

export interface CategoryTileProps {
  /** Backend category value ("all" for "Tout"). */
  value: string | null | undefined;
  /** Overrides the catalog label. */
  label?: string;
  onPress?: () => void;
  /** Marks the current filter with an ink ring. */
  selected?: boolean;
  /** Slot width; the label wraps to 2 lines inside it (default 72). */
  width?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function CategoryTile({
  value,
  label,
  onPress,
  selected = false,
  width = 72,
  style,
  testID,
}: CategoryTileProps) {
  const t = useTheme();
  const c = categoryColors(t.colors, value);
  const text = label ?? c.meta.label;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ selected }}
      haptic="selection"
      onPress={onPress}
      style={[styles.slot, { width }, style]}>
      <View
        style={[
          styles.tile,
          {
            backgroundColor: c.tint,
            borderRadius: t.radius.md,
            borderColor: selected ? t.colors.ink : 'transparent',
          },
        ]}>
        <Ionicons name={categoryIcon(value) as React.ComponentProps<typeof Ionicons>['name']} size={24} color={c.hue} />
      </View>
      <AppText variant="captionStrong" align="center" numberOfLines={2} style={{ color: c.text }}>
        {text}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  slot: { alignItems: 'center', gap: 8, minHeight: 48 },
  tile: { width: TILE, height: TILE, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

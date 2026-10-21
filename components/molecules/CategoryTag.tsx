/**
 * Category mnemonic tag (docs/09 §5): the category's fixed icon in its fixed
 * hue on a 12 % tint, with ink text. `iconOnly` gives a round icon badge for
 * cards, notifications and list rows.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { categoryIcon } from '@/constants/catalog';
import { categoryColors, useTheme } from '@/theme';
import AppText from '../atoms/AppText';

export interface CategoryTagProps {
  value: string | null | undefined;
  iconOnly?: boolean;
  /** Icon box size when iconOnly (default 28). */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function CategoryTag({ value, iconOnly, size = 28, style }: CategoryTagProps) {
  const t = useTheme();
  const c = categoryColors(t.colors, value);
  if (iconOnly) {
    return (
      <View
        accessibilityLabel={c.meta.label}
        style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.tint }, style]}>
        <Ionicons name={categoryIcon(value) as any} size={Math.round(size * 0.55)} color={c.hue} />
      </View>
    );
  }
  return (
    <View style={[styles.tag, { backgroundColor: c.tint, borderRadius: t.radius.full }, style]}>
      <Ionicons name={categoryIcon(value) as any} size={14} color={c.hue} />
      <AppText variant="captionStrong" style={{ color: c.text }} numberOfLines={1}>
        {c.meta.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
});

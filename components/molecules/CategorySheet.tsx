import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CATEGORIES, categoryIcon, TOP_CATEGORIES } from '@/constants/catalog';
import { categoryColors, useTheme } from '@/theme';
import PressableScale from '../motion/PressableScale';
import AppText from '../atoms/AppText';
import Sheet from '../organisms/Sheet';

/**
 * @deprecated use `categoryIcon()` from constants/catalog (single source of
 * the category mnemonics). Kept for older call sites: outline variants.
 */
export const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = Object.fromEntries(
  ['all', ...CATEGORIES.map((c) => c.value)].map((v) => [v, categoryIcon(v, false) as any]),
);

export { TOP_CATEGORIES };

export interface CategorySheetProps {
  visible: boolean;
  onClose: () => void;
  selected: string | null;
  onSelect: (value: string | null) => void;
}

/** All categories as a 2-column grid in a bottom sheet. */
export default function CategorySheet({ visible, onClose, selected, onSelect }: CategorySheetProps) {
  const t = useTheme();
  const items = [{ value: null as string | null, label: 'Toutes' }, ...CATEGORIES];
  return (
    <Sheet visible={visible} onClose={onClose} title="Catégories" snapPoints={[0.6, 0.9]}>
      <View style={styles.grid}>
        {items.map((c) => {
          const active = selected === c.value;
          const cc = categoryColors(t.colors, c.value ?? 'all');
          return (
            <PressableScale
              key={c.value ?? 'all'}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={c.label}
              haptic="selection"
              onPress={() => {
                onSelect(c.value);
                onClose();
              }}
              style={[
                styles.cell,
                {
                  borderRadius: t.radius.md,
                  borderColor: active ? t.colors.ink : t.colors.line,
                  borderWidth: active ? 2 : 1,
                  backgroundColor: t.colors.surface,
                },
              ]}>
              <View style={[styles.icon, { backgroundColor: cc.tint }]}>
                <Ionicons name={categoryIcon(c.value ?? 'all', active) as any} size={20} color={cc.hue} />
              </View>
              <AppText variant="labelStrong" style={{ color: t.colors.ink, flex: 1 }} numberOfLines={1}>
                {c.label}
              </AppText>
              {active && <Ionicons name="checkmark-circle" size={20} color={t.colors.ink} />}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
  cell: {
    width: '48%',
    flexGrow: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

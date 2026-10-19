import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORIES } from '@/constants/catalog';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Sheet from '../organisms/Sheet';

export const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  all: 'grid-outline',
  electronics: 'phone-portrait-outline',
  furniture: 'bed-outline',
  appliances: 'tv-outline',
  vehicles: 'car-outline',
  fashion: 'shirt-outline',
  baby_kids: 'happy-outline',
  sports: 'football-outline',
  books: 'book-outline',
  tools: 'construct-outline',
  other: 'ellipsis-horizontal-outline',
};

/** The 6 categories shown inline on Home (Hick: the rest live behind "Plus"). */
export const TOP_CATEGORIES = ['electronics', 'fashion', 'furniture', 'vehicles', 'appliances', 'baby_kids'];

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
    <Sheet visible={visible} onClose={onClose} title="Catégories">
      <View style={styles.grid}>
        {items.map((c) => {
          const active = selected === c.value;
          return (
            <Pressable
              key={c.value ?? 'all'}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={c.label}
              onPress={() => {
                onSelect(c.value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.cell,
                {
                  borderRadius: t.radius.md,
                  borderColor: active ? t.colors.brandStrong : t.colors.line,
                  backgroundColor: active ? t.colors.brandTint : pressed ? t.colors.surfaceAlt : t.colors.surface,
                },
              ]}>
              <Ionicons
                name={CATEGORY_ICONS[c.value ?? 'all'] ?? 'pricetag-outline'}
                size={22}
                color={active ? t.colors.brandStrong : t.colors.inkMuted}
              />
              <AppText variant="labelStrong" style={{ color: active ? t.colors.brandStrong : t.colors.ink, flex: 1 }} numberOfLines={1}>
                {c.label}
              </AppText>
            </Pressable>
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
    borderWidth: 1,
  },
});

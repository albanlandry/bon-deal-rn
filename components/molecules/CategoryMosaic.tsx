/**
 * Category mosaic (docs/12, Accueil): one large tile spanning two rows and
 * four small ones in a 2 × 2 grid; the last small tile is "Tout voir". Each
 * tile is the category's 12 % tint with its fixed icon in its fixed hue
 * (docs/09 §5 mnemonics), the label bottom-left in ink. Tight corners
 * (radius.md).
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { categoryIcon, categoryLabel } from '@/constants/catalog';
import { categoryColors, useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import PressableScale from '../motion/PressableScale';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ROW_H = 84;
const GAP = 8;

export interface CategoryMosaicProps {
  /** Four category values: the first is the large tile. */
  categories: string[];
  onSelect: (value: string) => void;
  onSeeAll: () => void;
}

function Tile({
  value,
  large,
  onPress,
}: {
  value: string | null;
  large?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const all = value === null;
  const c = categoryColors(t.colors, all ? 'all' : value);
  const label = all ? 'Tout voir' : categoryLabel(value);
  const icon = (all ? 'grid' : categoryIcon(value)) as IconName;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={all ? 'Voir toutes les catégories' : `Catégorie ${label}`}
      haptic="selection"
      onPress={onPress}
      style={[
        styles.tile,
        large ? styles.large : styles.small,
        { backgroundColor: c.tint, borderRadius: t.radius.md },
      ]}>
      <Ionicons name={icon} size={large ? 40 : 24} color={c.hue} style={large ? styles.iconLarge : styles.icon} />
      <AppText variant={large ? 'bodyStrong' : 'labelStrong'} numberOfLines={2} style={{ color: c.text }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export default function CategoryMosaic({ categories, onSelect, onSeeAll }: CategoryMosaicProps) {
  const [first, ...rest] = categories;
  const small: (string | null)[] = [...rest.slice(0, 3), null];
  return (
    <View style={styles.grid}>
      {first ? <Tile value={first} large onPress={() => onSelect(first)} /> : null}
      <View style={styles.smallGrid}>
        {small.map((v) => (
          <Tile key={v ?? 'all'} value={v} onPress={v ? () => onSelect(v) : onSeeAll} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: GAP, paddingHorizontal: 16 },
  smallGrid: { flex: 2, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { justifyContent: 'flex-end', padding: 10, overflow: 'hidden' },
  large: { flex: 1.25, height: ROW_H * 2 + GAP, padding: 12 },
  // Two per row inside smallGrid: (100 % − gap) / 2.
  small: { width: '47.5%', flexGrow: 1, height: ROW_H },
  icon: { position: 'absolute', top: 10, right: 10 },
  iconLarge: { position: 'absolute', top: 12, right: 12 },
});

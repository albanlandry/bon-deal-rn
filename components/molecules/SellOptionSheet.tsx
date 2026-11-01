import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import { searchByName } from '@/lib/textSearch';
import AppText from '../atoms/AppText';
import TextField from '../atoms/TextField';
import Sheet from '../organisms/Sheet';
import PressableScale from '../motion/PressableScale';
import CategoryTag from './CategoryTag';

export interface SellOption {
  value: string;
  label: string;
}

export interface SellOptionSheetProps {
  visible: boolean;
  title: string;
  options: SellOption[];
  selectedValue: string;
  emptyText?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
  /** Show a search field (accent-insensitive), e.g. for long quartier lists. */
  searchPlaceholder?: string;
  /** Options are categories: show each one's mnemonic icon + hue (docs/09 §5). */
  categoryIcons?: boolean;
}

/** Single-select bottom sheet over {value,label} options (thumb zone). */
export default function SellOptionSheet({
  visible,
  title,
  options,
  selectedValue,
  emptyText,
  onClose,
  onSelect,
  searchPlaceholder,
  categoryIcons,
}: SellOptionSheetProps) {
  const t = useTheme();
  const [filter, setFilter] = useState('');
  useEffect(() => {
    if (visible) setFilter('');
  }, [visible]);
  const shown = useMemo(
    () => (searchPlaceholder ? searchByName(options, filter, (o) => o.label) : options),
    [options, filter, searchPlaceholder],
  );
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {!!searchPlaceholder && options.length > 0 && (
        <TextField
          placeholder={searchPlaceholder}
          accessibilityLabel={searchPlaceholder}
          value={filter}
          onChangeText={setFilter}
          left={<Ionicons name="search" size={18} color={t.colors.inkSubtle} />}
          autoCorrect={false}
          autoCapitalize="none"
        />
      )}
      {shown.length === 0 && (
        <AppText variant="small" color="inkMuted" style={styles.empty}>
          {options.length && filter ? 'Aucun résultat.' : emptyText || 'Aucune option.'}
        </AppText>
      )}
      {shown.map((opt) => {
        const selected = opt.value === selectedValue;
        return (
          <PressableScale
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={opt.label}
            scaleTo={0.98}
            onPress={() => {
              haptics.selection();
              onSelect(opt.value);
              onClose();
            }}
            style={[styles.row, { borderBottomColor: t.colors.line }]}>
            {categoryIcons && <CategoryTag value={opt.value} iconOnly size={32} />}
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? t.colors.brandStrong : t.colors.inkSubtle}
            />
            <AppText variant="body" style={styles.flex}>
              {opt.label}
            </AppText>
          </PressableScale>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
  empty: { paddingVertical: 16 },
});

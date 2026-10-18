import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import AppText from '../atoms/AppText';
import Sheet from '../organisms/Sheet';

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
}: SellOptionSheetProps) {
  const t = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {options.length === 0 && (
        <AppText variant="small" color="inkMuted" style={styles.empty}>
          {emptyText || 'Aucune option.'}
        </AppText>
      )}
      {options.map((opt) => {
        const selected = opt.value === selectedValue;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={opt.label}
            onPress={() => {
              haptics.selection();
              onSelect(opt.value);
              onClose();
            }}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: t.colors.line },
              pressed && { backgroundColor: t.colors.surfaceAlt },
            ]}>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? t.colors.brandStrong : t.colors.inkSubtle}
            />
            <AppText variant="body" style={styles.flex}>
              {opt.label}
            </AppText>
          </Pressable>
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

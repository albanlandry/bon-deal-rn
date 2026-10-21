import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import PressableScale from '../motion/PressableScale';
import { useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import AppText from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** filter = toggles (checkbox semantics); choice = single select (radio). */
  kind?: 'filter' | 'choice' | 'action';
  trailingIcon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  kind = 'choice',
  trailingIcon,
  style,
  disabled,
}: ChipProps) {
  const t = useTheme();
  const fg = selected ? t.colors.brandStrong : t.colors.inkMuted;
  return (
    <PressableScale
      accessibilityRole={kind === 'filter' ? 'checkbox' : kind === 'choice' ? 'radio' : 'button'}
      accessibilityState={{ checked: kind !== 'action' ? selected : undefined, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[
        styles.base,
        {
          borderRadius: t.radius.full,
          backgroundColor: selected ? t.colors.brandTint : t.colors.surface,
          borderColor: selected ? t.colors.brandStrong : t.colors.line,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {icon && <Ionicons name={icon} size={16} color={fg} />}
      {selected && kind === 'filter' && !icon && (
        <Ionicons name="checkmark" size={16} color={fg} />
      )}
      <AppText variant="labelStrong" style={{ color: selected ? t.colors.brandStrong : t.colors.ink }} numberOfLines={1}>
        {label}
      </AppText>
      {trailingIcon && <Ionicons name={trailingIcon} size={16} color={fg} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
});

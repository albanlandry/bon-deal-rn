import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ColorTokens, useTheme } from '@/theme';
import AppText from './AppText';

export interface IconButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Required: screen-reader label. */
  label: string;
  onPress?: () => void;
  color?: keyof ColorTokens;
  variant?: 'plain' | 'tonal' | 'outline' | 'overlay';
  size?: number;
  badge?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 48 dp touch target regardless of the visual size. */
export default function IconButton({
  icon,
  label,
  onPress,
  color = 'ink',
  variant = 'plain',
  size = 22,
  badge,
  disabled,
  style,
}: IconButtonProps) {
  const t = useTheme();
  const bg =
    variant === 'tonal'
      ? t.colors.surfaceAlt
      : variant === 'overlay'
        ? t.colors.overlay
        : variant === 'outline'
          ? t.colors.surface
          : 'transparent';
  const fg = variant === 'overlay' ? t.colors.onOverlay : t.colors[color];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} non lus` : label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: variant === 'outline' ? t.colors.line : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}>
      <Ionicons name={icon} size={size} color={fg} />
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: t.colors.brand, borderColor: t.colors.surface }]}>
          <AppText variant="captionStrong" style={{ color: t.colors.onBrand, fontSize: 10, lineHeight: 13 }}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    margin: 2,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

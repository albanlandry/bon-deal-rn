import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import AppText from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'trust';
export type ButtonSize = 'md' | 'lg' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  /** Shown under the button while disabled, explains why (Norman). */
  disabledReason?: string;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Primary = coral fill with INK text (6.3:1). One primary per screen
 * (von Restorff). Min height 48 dp (Fitts).
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  disabledReason,
  fullWidth = false,
  haptic = false,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const c = t.colors;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.brand, fg: c.onBrand, border: c.brand },
    secondary: { bg: c.surface, fg: c.ink, border: c.line },
    ghost: { bg: 'transparent', fg: c.brandStrong, border: 'transparent' },
    danger: { bg: c.danger, fg: c.onDanger, border: c.danger },
    trust: { bg: c.trust, fg: t.isDark ? c.onBrand : '#FFFFFF', border: c.trust },
  };
  const p = palette[variant];
  const inactive = disabled || loading;
  const height = size === 'lg' ? 56 : size === 'sm' ? 40 : 48;
  const textVariant = size === 'sm' ? 'labelStrong' : 'bodyStrong';

  return (
    <View style={[fullWidth && styles.full, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={disabled && disabledReason ? disabledReason : accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        hitSlop={size === 'sm' ? 4 : 0}
        onPress={() => {
          if (haptic) haptics.light();
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: height,
            borderRadius: t.radius.full,
            backgroundColor: p.bg,
            borderColor: p.border,
            paddingHorizontal: size === 'sm' ? t.spacing.sm : t.spacing.xl,
            opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 20} color={p.fg} />}
            <AppText variant={textVariant} style={{ color: p.fg }} numberOfLines={1}>
              {label}
            </AppText>
            {iconRight && (
              <Ionicons name={iconRight} size={size === 'sm' ? 16 : 20} color={p.fg} />
            )}
          </>
        )}
      </Pressable>
      {disabled && !!disabledReason && (
        <AppText variant="caption" color="inkSubtle" align="center" style={styles.reason}>
          {disabledReason}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  reason: { marginTop: 6 },
});

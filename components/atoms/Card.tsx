import React from 'react';
import { Pressable, StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  tone?: 'surface' | 'brand' | 'trust' | 'warning' | 'muted';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export default function Card({
  onPress,
  padded = true,
  elevated = false,
  tone = 'surface',
  style,
  children,
  accessibilityLabel,
  ...rest
}: CardProps) {
  const t = useTheme();
  const bg = {
    surface: t.colors.surface,
    brand: t.colors.brandTint,
    trust: t.colors.trustTint,
    warning: t.colors.warningTint,
    muted: t.colors.surfaceAlt,
  }[tone];
  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: t.radius.md,
    borderWidth: tone === 'surface' ? 1 : 0,
    borderColor: t.colors.line,
    padding: padded ? t.spacing.md : 0,
    overflow: 'hidden',
    ...(elevated ? (t.elevation.card as ViewStyle) : null),
  };
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
        {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
}

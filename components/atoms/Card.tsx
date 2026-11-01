import React from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import PressableScale from '../motion/PressableScale';
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
    // Direction B is flat: hairline border + the faint `elevation.card`.
    ...(elevated || tone === 'surface' ? (t.elevation.card as ViewStyle) : null),
  };
  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[base, style]}
        {...(rest as object)}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={[base, style]} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
}

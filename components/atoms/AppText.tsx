import React from 'react';
import { Text, TextProps } from 'react-native';
import { ColorTokens, useTheme } from '@/theme';
import type { type as typeTokens } from '@/theme/tokens';

export type TextVariant = keyof typeof typeTokens;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
}

/** Themed text: type-scale variant + colour token. Respects dynamic type. */
export default function AppText({
  variant = 'body',
  color = 'ink',
  align,
  style,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: AppTextProps) {
  const t = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[t.type[variant], { color: t.colors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}

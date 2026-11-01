import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { formatAmount } from '@/lib/format';
import AppText from './AppText';

export interface PriceProps {
  amount: number | null | undefined;
  isFree?: boolean;
  isExchange?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<TextStyle>;
}

/**
 * Price first, chunked with thin spaces ("150 000 FCFA", Miller). Free items
 * read "Gratuit" in the success colour (framing), never "0 FCFA".
 */
export default function Price({ amount, isFree, isExchange, size = 'md', style }: PriceProps) {
  const variant = size === 'lg' ? 'priceLarge' : size === 'sm' ? 'bodyStrong' : 'price';
  // Direction B: price is a bold ink line, digits tabular so lists align.
  const textStyle: StyleProp<TextStyle> = [size === 'sm' && tabular, style];
  if (isFree) {
    return (
      <AppText variant={variant} color="success" style={textStyle} accessibilityLabel="Gratuit">
        Gratuit
      </AppText>
    );
  }
  if ((amount == null || amount === 0) && isExchange) {
    return (
      <AppText variant={variant} color="trust" style={textStyle}>
        Échange
      </AppText>
    );
  }
  const text = formatAmount(amount);
  return (
    <AppText variant={variant} color="ink" style={textStyle} accessibilityLabel={text.replace(/ /g, ' ')}>
      {text}
    </AppText>
  );
}

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

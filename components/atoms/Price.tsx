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
  if (isFree) {
    return (
      <AppText variant={variant} color="success" style={style} accessibilityLabel="Gratuit">
        Gratuit
      </AppText>
    );
  }
  if ((amount == null || amount === 0) && isExchange) {
    return (
      <AppText variant={variant} color="trust" style={style}>
        Échange
      </AppText>
    );
  }
  const text = formatAmount(amount);
  return (
    <AppText variant={variant} color="ink" style={style} accessibilityLabel={text.replace(/ /g, ' ')}>
      {text}
    </AppText>
  );
}

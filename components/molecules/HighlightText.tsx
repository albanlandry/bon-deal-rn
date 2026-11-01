import React from 'react';
import AppText, { type AppTextProps } from '../atoms/AppText';
import { highlightParts } from './highlight';

/** Text with the typed query in bold (recognition over recall). */
export default function HighlightText({ text, query, ...rest }: AppTextProps & { text: string; query: string }) {
  const parts = highlightParts(text, query);
  return (
    <AppText {...rest}>
      {parts.map((p, i) =>
        p.match ? (
          <AppText key={i} variant="bodyStrong" color="ink">
            {p.text}
          </AppText>
        ) : (
          p.text
        ),
      )}
    </AppText>
  );
}

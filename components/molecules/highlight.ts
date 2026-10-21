/**
 * Accent- and case-insensitive match range for suggestion highlighting
 * (docs/09 §4 Search: "the typed part highlighted"). Pure, no RN imports.
 */

const FOLD: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
  ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ñ: 'n',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
};

/** Fold ONE character so indices stay aligned with the original text. */
export function foldChar(ch: string): string {
  const l = ch.toLowerCase();
  if (FOLD[l]) return FOLD[l];
  try {
    const n = l.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return n.length === 1 ? n : l;
  } catch {
    return l;
  }
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/** Split `text` around the first occurrence of `query` (folded). */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const q = Array.from(query.trim()).map(foldChar).join('');
  if (!q || !text) return [{ text, match: false }];
  const chars = Array.from(text);
  const folded = chars.map(foldChar).join('');
  const at = folded.indexOf(q);
  if (at < 0) return [{ text, match: false }];
  const end = at + q.length;
  const parts: HighlightPart[] = [];
  if (at > 0) parts.push({ text: chars.slice(0, at).join(''), match: false });
  parts.push({ text: chars.slice(at, end).join(''), match: true });
  if (end < chars.length) parts.push({ text: chars.slice(end).join(''), match: false });
  return parts;
}

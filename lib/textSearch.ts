/**
 * Accent- and case-insensitive matching for the city / quartier pickers:
 * "lambarene" finds "Lambaréné", "akebe ville" finds "Akébé-Ville".
 */

// Explicit fold table: works even where String.prototype.normalize is
// missing or incomplete (some Hermes builds without full Intl).
const FOLD: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', ā: 'a',
  ç: 'c', č: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e', ē: 'e', ė: 'e', ę: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i', ī: 'i',
  ñ: 'n',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ō: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u', ū: 'u',
  ý: 'y', ÿ: 'y',
  œ: 'oe', æ: 'ae', ß: 'ss',
};
const FOLD_RE = /[^\u0000-\u007f]/g;

/** Lower-case, strip accents, turn punctuation into spaces, collapse spaces. */
export function normalizeText(value: string | null | undefined): string {
  let s = (value ?? '').toLowerCase();
  try {
    s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    // no normalize(): the table below still covers French / Latin accents
  }
  s = s.replace(FOLD_RE, (ch) => FOLD[ch] ?? ch);
  return s
    .replace(/[^a-z0-9\u0080-￿]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Items whose name contains every word of the query (in any order), names
 * that start with the query first; the original order is kept otherwise.
 * An empty query returns the list unchanged.
 */
export function searchByName<T>(items: readonly T[], query: string, getName: (item: T) => string): T[] {
  const q = normalizeText(query);
  if (!q) return items.slice();
  const words = q.split(' ');
  const starts: T[] = [];
  const contains: T[] = [];
  for (const item of items) {
    const name = normalizeText(getName(item));
    if (!words.every((w) => name.includes(w))) continue;
    (name.startsWith(q) ? starts : contains).push(item);
  }
  return [...starts, ...contains];
}

/** Same name ignoring case, accents and punctuation. */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && normalizeText(a) === normalizeText(b);
}

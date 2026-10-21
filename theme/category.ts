/**
 * Category hue → concrete colours for the current scheme (docs/09 §5):
 * the hue is used for the icon, a ~12 % tint of it for the background, and
 * text stays `ink` so contrast is AA in light and dark mode.
 */
import { categoryMeta, type CategoryMeta } from '@/constants/catalog';
import { blend } from './color';
import type { ColorTokens } from './tokens';

export const CATEGORY_TINT_ALPHA = 0.12;

export interface CategoryColors {
  meta: CategoryMeta;
  /** Icon / accent colour. */
  hue: string;
  /** Opaque tinted background (hue at 12 % over `surface`). */
  tint: string;
  /** Text colour on the tint. */
  text: string;
}

const cache = new Map<string, string>();

export function categoryColors(colors: ColorTokens, value: string | null | undefined): CategoryColors {
  const meta = categoryMeta(value);
  const hue = colors[meta.hue];
  const key = `${hue}|${colors.surface}`;
  let tint = cache.get(key);
  if (!tint) {
    tint = blend(hue, colors.surface, CATEGORY_TINT_ALPHA);
    cache.set(key, tint);
  }
  return { meta, hue, tint, text: colors.ink };
}

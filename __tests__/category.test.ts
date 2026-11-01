import {
  ALL_CATEGORIES_META,
  CATEGORIES,
  CATEGORY_META,
  categoryIcon,
  categoryLabel,
  categoryMeta,
} from '@/constants/catalog';
import { categoryColors } from '@/theme/category';
import { blend, contrastRatio, withAlpha } from '@/theme/color';
import { darkColors, lightColors } from '@/theme/tokens';

describe('category mnemonics (docs/09 §5)', () => {
  it('gives every backend category one fixed icon and one unique hue', () => {
    expect(Object.keys(CATEGORY_META)).toHaveLength(CATEGORIES.length);
    const hues = new Set(CATEGORIES.map((c) => categoryMeta(c.value).hue));
    expect(hues.size).toBe(CATEGORIES.length);
    expect(categoryMeta('electronics')).toMatchObject({ icon: 'phone-portrait', hue: 'catBlue', label: 'Électronique' });
    expect(categoryMeta('fashion').hue).toBe('catPink');
    expect(categoryMeta('tools').icon).toBe('hammer');
    expect(categoryMeta('other')).toMatchObject({ icon: 'apps', hue: 'catGrey' });
  });

  it('falls back to "Autres" for unknown values and maps "all"', () => {
    expect(categoryMeta('nope').value).toBe('other');
    expect(categoryMeta(null).value).toBe('other');
    expect(categoryMeta('all')).toBe(ALL_CATEGORIES_META);
    expect(categoryLabel('books')).toBe('Livres');
  });

  it('returns filled or outline icon names', () => {
    expect(categoryIcon('vehicles')).toBe('car');
    expect(categoryIcon('vehicles', false)).toBe('car-outline');
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('keeps hue and ink at AA on the 12 %% tint in %s mode', (_, colors) => {
    for (const c of [...CATEGORIES.map((x) => x.value), 'all']) {
      const cc = categoryColors(colors, c);
      expect(contrastRatio(cc.hue, cc.tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(cc.text, cc.tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(cc.hue, colors.canvas)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('colour helpers', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Doc 06: ink on brand-500 = 6.3:1
    expect(contrastRatio(lightColors.onBrand, lightColors.brand)).toBeGreaterThan(6);
  });

  it('blends and builds rgba strings', () => {
    expect(blend('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(blend('#FF0000', '#FFFFFF', 0)).toBe('#ffffff');
    expect(withAlpha('#1D4ED8', 0.12)).toBe('rgba(29,78,216,0.12)');
  });
});

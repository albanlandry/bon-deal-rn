/**
 * "Confiance" design tokens — direction B of docs/11-new-design-proposal.md
 * (chosen 2026-10-22; replaces the coral "Marché" palette of docs/06 §3).
 * Deep blue + teal on cool greys, Inter, 12 px cards, hairline borders.
 *
 * Every colour pair used for text was checked against WCAG 2.1 AA (light:
 * white on brand 6.7:1, subtle text 5.1:1 on canvas; dark: dark ink on brand
 * 7.6:1). Token names are unchanged so components only pick up new values.
 */
import { Platform, TextStyle } from 'react-native';

export interface ColorTokens {
  brand: string; // brand-500 — primary fills (buttons, active tab, FAB)
  brandStrong: string; // brand-700 — brand text/icons on surfaces
  brandTint: string; // brand-50 — tinted backgrounds, selected chips
  onBrand: string; // text/icons on `brand` fills (white in light, dark ink in dark)
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  surface: string;
  surfaceAlt: string; // slightly raised/sunken variant for inputs, skeletons
  canvas: string;
  line: string;
  trust: string; // trust-600 — verified, safety
  trustTint: string;
  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
  danger: string;
  dangerTint: string;
  onDanger: string;
  scrim: string; // backdrop behind sheets
  overlay: string; // translucent chip over imagery
  onOverlay: string;
  skeleton: string;
  skeletonHighlight: string;
  /**
   * Category mnemonic hues (docs/09 §5). Used for icons on a ~12 % tint of
   * themselves (`categoryColors()` in theme/category.ts) with ink text; every
   * hue is ≥ 4.5:1 on its own tint and on the canvas, in both schemes.
   */
  catBlue: string;
  catPink: string;
  catBrown: string;
  catTeal: string;
  catIndigo: string;
  catYellow: string;
  catGreen: string;
  catPurple: string;
  catOrange: string;
  catGrey: string;
}

export type CategoryHue =
  | 'catBlue'
  | 'catPink'
  | 'catBrown'
  | 'catTeal'
  | 'catIndigo'
  | 'catYellow'
  | 'catGreen'
  | 'catPurple'
  | 'catOrange'
  | 'catGrey';

export const lightColors: ColorTokens = {
  brand: '#1D4ED8',
  brandStrong: '#1E40AF',
  brandTint: '#E8EEFD',
  onBrand: '#FFFFFF',
  ink: '#0F1B2D',
  inkMuted: '#46546A',
  inkSubtle: '#5D6A80',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F6',
  canvas: '#F4F6FA',
  line: '#E3E8F0',
  trust: '#0F766E',
  trustTint: '#E6F4F2',
  success: '#15803D',
  successTint: '#EAF6EE',
  warning: '#B45309',
  warningTint: '#FDF3E7',
  danger: '#B91C1C',
  dangerTint: '#FDECEC',
  onDanger: '#FFFFFF',
  scrim: 'rgba(15,27,45,0.5)',
  overlay: 'rgba(15,27,45,0.72)',
  onOverlay: '#FFFFFF',
  skeleton: '#E9EDF3',
  skeletonHighlight: '#F3F5F9',
  catBlue: '#1D4ED8',
  catPink: '#BE185D',
  catBrown: '#8A4B1C',
  catTeal: '#0F766E',
  catIndigo: '#4338CA',
  catYellow: '#8A5A00',
  catGreen: '#166534',
  catPurple: '#7E22CE',
  catOrange: '#A93A0B',
  catGrey: '#57534E',
};

export const darkColors: ColorTokens = {
  brand: '#7AA2FF',
  brandStrong: '#A8C1FF',
  brandTint: '#17264A',
  onBrand: '#0B1220',
  ink: '#E8EDF5',
  inkMuted: '#A9B4C6',
  inkSubtle: '#8693A8',
  surface: '#131C2B',
  surfaceAlt: '#1B2638',
  canvas: '#0B1220',
  line: '#233046',
  trust: '#2DD4BF',
  trustTint: '#0F2E2D',
  success: '#4ADE80',
  successTint: '#10291C',
  warning: '#FBBF24',
  warningTint: '#33270B',
  danger: '#F87171',
  dangerTint: '#3A1418',
  onDanger: '#0B1220',
  scrim: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(11,18,32,0.8)',
  onOverlay: '#E8EDF5',
  skeleton: '#1B2638',
  skeletonHighlight: '#233046',
  catBlue: '#60A5FA',
  catPink: '#F472B6',
  catBrown: '#D9A06B',
  catTeal: '#2DD4BF',
  catIndigo: '#A5B4FC',
  catYellow: '#FACC15',
  catGreen: '#4ADE80',
  catPurple: '#C084FC',
  catOrange: '#FB923C',
  catGrey: '#A8A29E',
};

/** 4-point grid. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

/**
 * Tight corners (user decision 2026-10-23, docs/12): only avatars and dots
 * are round; no pill-shaped buttons or chips.
 */
export const radius = {
  xs: 4, // badges, small tags
  sm: 6, // chips, inputs, small tiles
  md: 8, // cards, buttons, photos
  lg: 12, // sheets, floating bars, hero blocks
  full: 999, // avatars, dots only
} as const;

/** Button corner radius. */
export const buttonRadius = 8;

/**
 * Inter, loaded in app/_layout.tsx (3 files, ~1 MB in the bundle). Android
 * can't pick a weight inside a custom family, so each weight is its own
 * family and `fontWeight` is left unset; 500 maps to SemiBold, 800/900 to Bold.
 */
export const fontFiles = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
} as const;

/** Text style for a weight: the matching Inter family, no synthetic bold. */
export function font(weight: TextStyle['fontWeight'] = '400'): TextStyle {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' ? 400 : weight) || 400;
  const fontFamily = w >= 700 ? 'Inter_700Bold' : w >= 500 ? 'Inter_600SemiBold' : 'Inter_400Regular';
  return { fontFamily, fontWeight: Platform.OS === 'web' ? (String(w) as TextStyle['fontWeight']) : undefined };
}

const t = (size: number, weight: TextStyle['fontWeight'], heading = false): TextStyle => ({
  ...font(weight),
  fontSize: size,
  lineHeight: Math.round(size * (heading ? 1.2 : 1.4)),
});

/** Prices and counts line up in lists. */
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Type scale 12 / 14 / 16 / 18 / 22 / 28 / 34. */
export const type = {
  display: t(34, '700', true),
  h1: t(28, '700', true),
  h2: t(22, '700', true),
  h3: t(18, '600', true),
  body: t(16, '400'),
  bodyStrong: t(16, '600'),
  label: t(14, '500'),
  labelStrong: t(14, '600'),
  small: t(14, '400'),
  caption: t(12, '400'),
  captionStrong: t(12, '600'),
  price: { ...t(18, '700', true), ...tabular },
  priceLarge: { ...t(28, '700', true), ...tabular },
} as const;

/** Legacy short-hand kept for existing call sites; see theme/motion.ts. */
export const motion = {
  micro: 150,
  enter: 250,
  exit: 200,
} as const;

/** Minimum touch target (dp). */
export const touch = { min: 48 } as const;

export const elevation = {
  // Direction B is flat: cards rely on a hairline border, with only a faint
  // shadow on iOS (Android elevation shadows are grey and heavy on lists).
  card: Platform.select({
    android: { elevation: 0 },
    default: {
      shadowColor: '#0F1B2D',
      shadowOpacity: 0.06,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
    },
  }),
  sheet: Platform.select({
    android: { elevation: 8 },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
    },
  }),
} as const;

export type ColorSchemeName = 'light' | 'dark';
export type ThemePreference = 'system' | ColorSchemeName;

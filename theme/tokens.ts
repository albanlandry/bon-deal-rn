/**
 * "Marché" design tokens — see docs/06-ux-psychology-and-design.md §3.
 *
 * Every colour pair used for text was checked against WCAG 2.1 AA. The one
 * rule that matters most: `brand` (coral) is a FILL colour and always carries
 * `onBrand` (ink) text. White on #FF6B6B is 2.8:1 and fails AA.
 */
import { Platform, TextStyle } from 'react-native';

export interface ColorTokens {
  brand: string; // brand-500 — primary fills (buttons, active tab, FAB)
  brandStrong: string; // brand-700 — brand text/icons on surfaces
  brandTint: string; // brand-50 — tinted backgrounds, selected chips
  onBrand: string; // text/icons on `brand` fills (ink)
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
  brand: '#FF6B6B',
  brandStrong: '#C8363A',
  brandTint: '#FFF1F0',
  onBrand: '#1C1917',
  ink: '#1C1917',
  inkMuted: '#57534E',
  inkSubtle: '#78716C',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F4',
  canvas: '#FAFAF9',
  line: '#E7E5E4',
  trust: '#0F766E',
  trustTint: '#E6F4F2',
  success: '#15803D',
  successTint: '#EAF6EE',
  warning: '#B45309',
  warningTint: '#FDF3E7',
  danger: '#DC2626',
  dangerTint: '#FDECEC',
  onDanger: '#FFFFFF',
  scrim: 'rgba(12,10,9,0.5)',
  overlay: 'rgba(28,25,23,0.72)',
  onOverlay: '#FFFFFF',
  skeleton: '#EFEDEB',
  skeletonHighlight: '#F7F6F5',
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
  brand: '#FF8A80',
  brandStrong: '#FFB4AB',
  brandTint: '#3B1D1B',
  onBrand: '#1C1917',
  ink: '#F5F5F4',
  inkMuted: '#A8A29E',
  inkSubtle: '#8A847F',
  surface: '#1C1917',
  surfaceAlt: '#262220',
  canvas: '#0C0A09',
  line: '#292524',
  trust: '#2DD4BF',
  trustTint: '#10302C',
  success: '#4ADE80',
  successTint: '#12301D',
  warning: '#FBBF24',
  warningTint: '#3A2A0A',
  danger: '#F87171',
  dangerTint: '#3A1414',
  onDanger: '#1C1917',
  scrim: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(12,10,9,0.78)',
  onOverlay: '#F5F5F4',
  skeleton: '#262220',
  skeletonHighlight: '#302B28',
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

export const radius = {
  sm: 8, // inputs, chips
  md: 12, // cards
  lg: 16, // sheets
  full: 999, // pills, avatars
} as const;

const fontFamily = Platform.select({ ios: 'System', default: undefined });

const t = (size: number, weight: TextStyle['fontWeight'], heading = false): TextStyle => ({
  fontFamily,
  fontSize: size,
  lineHeight: Math.round(size * (heading ? 1.2 : 1.4)),
  fontWeight: weight,
});

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
  price: t(18, '700', true),
  priceLarge: t(28, '700', true),
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
  card: Platform.select({
    android: { elevation: 1 },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
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

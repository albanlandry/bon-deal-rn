/**
 * Single source of truth for the catalog enums shared with the backend
 * (ai_service.CATEGORY_ENUM, Post.condition, Post.age_bucket, Post.state) and
 * their French UI labels. Screens store the ENUM VALUE and render the label.
 */

export interface CatalogOption {
  value: string;
  label: string;
}

/** The 10 backend category buckets (ai_service.CATEGORY_ENUM). */
export const CATEGORIES: CatalogOption[] = [
  { value: 'electronics', label: 'Électronique' },
  { value: 'furniture', label: 'Meubles' },
  { value: 'appliances', label: 'Électroménager' },
  { value: 'vehicles', label: 'Véhicules' },
  { value: 'fashion', label: 'Mode' },
  { value: 'baby_kids', label: 'Bébé & Enfants' },
  { value: 'sports', label: 'Sports' },
  { value: 'books', label: 'Livres' },
  { value: 'tools', label: 'Outils' },
  { value: 'other', label: 'Autres' },
];

/**
 * Category mnemonics (docs/09 §5): each category has ONE fixed icon and ONE
 * fixed hue, used everywhere it appears (chip, card badge, filter,
 * notification, sell step). `icon` is the Ionicons base name; use
 * `categoryIcon(v, false)` for the outline variant.
 */
export type CategoryHueToken =
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

export interface CategoryMeta {
  value: string;
  label: string;
  /** Ionicons glyph (filled); the `-outline` variant exists for every one. */
  icon: string;
  hue: CategoryHueToken;
}

const META: Record<string, { icon: string; hue: CategoryHueToken }> = {
  electronics: { icon: 'phone-portrait', hue: 'catBlue' },
  fashion: { icon: 'shirt', hue: 'catPink' },
  furniture: { icon: 'bed', hue: 'catBrown' },
  appliances: { icon: 'tv', hue: 'catTeal' },
  vehicles: { icon: 'car', hue: 'catIndigo' },
  baby_kids: { icon: 'happy', hue: 'catYellow' },
  sports: { icon: 'football', hue: 'catGreen' },
  books: { icon: 'book', hue: 'catPurple' },
  tools: { icon: 'hammer', hue: 'catOrange' },
  other: { icon: 'apps', hue: 'catGrey' },
};

/** Pseudo-category for "Tout" / "Toutes" chips. */
export const ALL_CATEGORIES_META: CategoryMeta = {
  value: 'all',
  label: 'Tout',
  icon: 'grid',
  hue: 'catGrey',
};

/** The 6 categories shown inline on Home (Hick: the rest live behind "Plus"). */
export const TOP_CATEGORIES = ['electronics', 'fashion', 'furniture', 'vehicles', 'appliances', 'baby_kids'];

export const CONDITIONS: CatalogOption[] = [
  { value: 'excellent', label: 'Excellent état' },
  { value: 'good', label: 'Bon état' },
  { value: 'fair', label: 'État correct' },
  { value: 'poor', label: 'À réparer' },
];

export const AGE_BUCKETS: CatalogOption[] = [
  { value: 'lt_6mo', label: 'Moins de 6 mois' },
  { value: '6mo_2y', label: '6 mois – 2 ans' },
  { value: '2y_5y', label: '2 – 5 ans' },
  { value: 'gt_5y', label: 'Plus de 5 ans' },
];

export interface StateBadge {
  label: string;
  color: string;
}

/** Post.state → badge. reserved/unpublished both read as unavailable. */
export const STATE_BADGES: Record<string, StateBadge> = {
  published: { label: 'Disponible', color: '#28A745' },
  sold: { label: 'Vendu', color: '#D9534F' },
  draft: { label: 'Brouillon', color: '#8a8a8a' },
  reserved: { label: 'Réservé', color: '#E0A100' },
  unpublished: { label: 'Indisponible', color: '#8a8a8a' },
};

const byValue = (opts: CatalogOption[]) =>
  Object.fromEntries(opts.map((o) => [o.value, o.label])) as Record<string, string>;

export const CATEGORY_LABELS = byValue(CATEGORIES);
export const CONDITION_LABELS = byValue(CONDITIONS);
export const AGE_LABELS = byValue(AGE_BUCKETS);

export const categoryLabel = (v: string | null | undefined) =>
  (v && CATEGORY_LABELS[v]) || 'Autres';
export const conditionLabel = (v: string | null | undefined) =>
  (v && CONDITION_LABELS[v]) || null;
export const stateBadge = (v: string | null | undefined): StateBadge =>
  (v && STATE_BADGES[v]) || STATE_BADGES.published;

export const CATEGORY_META: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, { ...c, ...META[c.value] }]),
);

/** Meta for a backend category value; unknown/empty → "Autres". */
export function categoryMeta(v: string | null | undefined): CategoryMeta {
  if (v === 'all') return ALL_CATEGORIES_META;
  return (v && CATEGORY_META[v]) || CATEGORY_META.other;
}

/** Ionicons name for a category, filled (selected) or outline. */
export function categoryIcon(v: string | null | undefined, filled = true): string {
  const base = categoryMeta(v).icon;
  return filled ? base : `${base}-outline`;
}

/** Narrow no-break space: thin-space digit grouping that never wraps. */
export const THIN_SPACE = '\u202F';

/** "12 500 FCFA" — thin-space-grouped amount (Miller chunking), Intl-independent
 *  (Hermes-safe). The unit is glued with a no-break space. */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${formatNumber(value)}\u00A0FCFA`;
}

/** "12 500" — grouped integer without unit. */
export function formatNumber(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
}

/** Section label for grouping lists by day: "Aujourd'hui", "Hier", "12 octobre". */
const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
export function formatDayLabel(iso: string | null | undefined): string {
  if (!iso) return 'Plus ancien';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Plus ancien';
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** "Membre depuis mars 2025". */
export function formatMemberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Membre depuis ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Short relative time in French: "à l'instant", "Il y a 5 min", "Il y a 3 h",
 *  "Il y a 2 j", else "d/m". */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Il y a ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `Il y a ${day} j`;
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/** Clock time "14:32" for chat message timestamps. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

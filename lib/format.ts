/** "12 500 FCFA" — space-grouped amount, Intl-independent (Hermes-safe). */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const grouped = String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped} FCFA`;
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

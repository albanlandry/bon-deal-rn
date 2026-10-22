/** Transactions (created when an offer is accepted), disputes and reviews. */
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiErrorMessage, apiFetch } from '@/lib/api';
import type { BdReview, BdTransaction } from '@/constants/types';

interface TxnResponse {
  success: boolean;
  transaction: BdTransaction;
}

export function transactionsQuery(status?: string) {
  return queryOptions({
    queryKey: ['transactions', status ?? 'all'],
    queryFn: async () => {
      const q = new URLSearchParams({ page: '1', limit: '100' });
      if (status) q.set('status', status);
      const res = await apiFetch<{ total: number; transactions: BdTransaction[] }>(`/transactions?${q}`);
      return res.transactions;
    },
  });
}

export function transactionQuery(id: number | null | undefined) {
  return queryOptions({
    queryKey: ['transaction', id],
    queryFn: async () => (await apiFetch<TxnResponse>(`/transactions/${id}`)).transaction,
    enabled: !!id && id > 0,
  });
}

/** Parties move a pending transaction to completed or cancelled. */
export async function updateTransactionStatus(
  id: number,
  status: 'completed' | 'cancelled',
  cancellationReason?: string,
): Promise<BdTransaction> {
  const res = await apiFetch<TxnResponse>(`/transactions/${id}/status`, {
    method: 'PATCH',
    body: { status, cancellation_reason: cancellationReason?.trim() || undefined },
  });
  return res.transaction;
}

/** Flag a completed transaction (reason 10–500 chars). */
export async function openDispute(id: number, reason: string): Promise<BdTransaction> {
  const res = await apiFetch<TxnResponse>(`/transactions/${id}/dispute`, {
    method: 'POST',
    body: { reason: reason.trim() },
  });
  return res.transaction;
}

export async function createReview(id: number, rating: number, comment?: string): Promise<BdReview> {
  const res = await apiFetch<{ success: boolean; review: BdReview }>(`/transactions/${id}/reviews`, {
    method: 'POST',
    body: { rating, comment: comment?.trim() || undefined },
  });
  return res.review;
}

/** Body of PATCH /transactions/{id}/meeting: omitted = kept, null = cleared. */
export interface MeetingPatch {
  meeting_location?: string | null;
  /** ISO datetime with an offset (we send UTC, `toISOString()`). */
  meeting_at?: string | null;
}

/** Set or change the hand-over place and/or time (pending deals only). */
export async function updateMeeting(id: number, patch: MeetingPatch): Promise<BdTransaction> {
  const res = await apiFetch<TxnResponse>(`/transactions/${id}/meeting`, { method: 'PATCH', body: patch });
  return res.transaction;
}

export function meetingErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'meeting_in_past') return 'Choisissez une heure à venir.';
    if (e.code === 'meeting_too_far') return apiErrorMessage(e, 'Le rendez-vous doit avoir lieu dans les 60 prochains jours.');
    if (e.code === 'meeting_empty') return 'Indiquez un lieu ou une heure de rendez-vous.';
    if (e.code === 'transaction_not_pending') return 'Le rendez-vous ne peut plus être modifié : l’affaire est terminée.';
  }
  return transactionErrorMessage(e);
}

// --- Meeting time helpers (pure) -----------------------------------------

/** The API returns naive UTC ISO strings ("2026-10-23T17:00:00"): read them as UTC. */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "18 h", "18 h 30" (French clock). */
export function formatHour(d: Date): string {
  const m = d.getMinutes();
  return `${d.getHours()}\u00A0h${m ? `\u00A0${pad2(m)}` : ''}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "aujourd’hui à 18 h", "demain à 9 h 30", "le 23/10 à 18 h" (device local time). */
export function formatMeetingWhen(d: Date, now: Date = new Date()): string {
  const days = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  const day =
    days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `le ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  return `${day} à ${formatHour(d)}`;
}

/** One line for a meeting: "le 23/10 à 18 h · Rond-point de Louis", or null when none is set. */
export function meetingSummary(
  m: { meeting_at?: string | null; meeting_location?: string | null },
  now: Date = new Date(),
): string | null {
  const at = parseServerDate(m.meeting_at);
  const place = m.meeting_location?.trim() || null;
  const parts = [at ? formatMeetingWhen(at, now) : null, place].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Deal page headline, by status then meeting. */
export function dealHeadline(txn: BdTransaction, iAmSeller: boolean, now: Date = new Date()): string {
  if (txn.status === 'completed') return iAmSeller ? 'Vente conclue' : 'Achat conclu';
  if (txn.status === 'cancelled') return iAmSeller ? 'Vente annulée' : 'Achat annulé';
  if (txn.status === 'disputed') return 'Litige en cours d’examen';
  const at = parseServerDate(txn.meeting_at);
  if (at) {
    const when = formatMeetingWhen(at, now);
    return `Rendez-vous ${when}`;
  }
  const place = txn.meeting_location?.trim();
  if (place) return `Rendez-vous : ${place}`;
  return 'Fixez un rendez-vous';
}

/** Message for transaction / review failures: the server's detail, by status otherwise. */
export function transactionErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    // 409 covers "already reviewed", "review window expired", "not completed
    // yet" and concurrent changes: the server's French detail says which.
    if (e.code === 'already_reviewed') return apiErrorMessage(e, 'Vous avez déjà laissé un avis.');
    if (e.code === 'review_window_expired') return apiErrorMessage(e, 'Le délai pour laisser un avis est dépassé.');
    if (e.code === 'transaction_not_completed') return apiErrorMessage(e, 'La vente doit être conclue avant de laisser un avis.');
    if (e.status === 409) return apiErrorMessage(e, 'Cette transaction a changé entre-temps. Actualisez.');
    if (e.status === 403) return apiErrorMessage(e, 'Vous ne participez pas à cette transaction.');
    if (e.status === 404) return 'Transaction introuvable.';
    if (e.status === 422) return 'Vérifiez les informations saisies.';
  }
  return apiErrorMessage(e, 'Action impossible. Réessayez.');
}

export const TXN_STATUS_LABEL: Record<string, string> = {
  pending: 'En cours',
  completed: 'Conclue',
  cancelled: 'Annulée',
  disputed: 'Litige ouvert',
};

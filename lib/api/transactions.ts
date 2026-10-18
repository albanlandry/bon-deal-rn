/** Transactions (created when an offer is accepted), disputes and reviews. */
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch } from '@/lib/api';
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

/** French message for transaction / review failures (server details are English). */
export function transactionErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) {
      if (/already reviewed/i.test(e.message)) return 'Vous avez déjà laissé un avis.';
      if (/window expired/i.test(e.message)) return 'Le délai pour laisser un avis est dépassé.';
      if (/completed before/i.test(e.message)) return 'La vente doit être conclue avant de laisser un avis.';
      return 'Cette transaction a changé entre-temps. Actualisez.';
    }
    if (e.status === 403) return 'Vous ne participez pas à cette transaction.';
    if (e.status === 404) return 'Transaction introuvable.';
    if (e.status === 422) return 'Vérifiez les informations saisies.';
  }
  return 'Action impossible. Réessayez.';
}

export const TXN_STATUS_LABEL: Record<string, string> = {
  pending: 'En cours',
  completed: 'Conclue',
  cancelled: 'Annulée',
  disputed: 'Litige ouvert',
};

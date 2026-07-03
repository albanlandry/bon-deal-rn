import { apiFetch } from '@/lib/api';
import type { BdCoachVerdict, BdNegotiation } from '@/constants/types';

interface NegotiationResponse {
  success: boolean;
  negotiation: BdNegotiation;
}

interface OfferInput {
  amount: number;
  message?: string;
}

/** Buyer opens a negotiation on a post with an initial offer. */
export async function openNegotiation(
  postId: number,
  input: OfferInput,
): Promise<BdNegotiation> {
  const res = await apiFetch<NegotiationResponse>(`/posts/${postId}/negotiations`, {
    method: 'POST',
    body: { amount: input.amount, message: input.message ?? null },
  });
  return res.negotiation;
}

/** Either party counters the current offer (must not be the last offerer). */
export async function counterOffer(
  negotiationId: number,
  input: OfferInput,
): Promise<BdNegotiation> {
  const res = await apiFetch<NegotiationResponse>(
    `/negotiations/${negotiationId}/offers`,
    {
      method: 'POST',
      body: { amount: input.amount, message: input.message ?? null },
    },
  );
  return res.negotiation;
}

/** Accept the current offer — creates a pending transaction, reserves the post. */
export async function acceptOffer(negotiationId: number): Promise<BdNegotiation> {
  const res = await apiFetch<NegotiationResponse>(
    `/negotiations/${negotiationId}/accept`,
    { method: 'POST' },
  );
  return res.negotiation;
}

/** Reject (walk away from) a pending negotiation. */
export async function rejectOffer(negotiationId: number): Promise<BdNegotiation> {
  const res = await apiFetch<NegotiationResponse>(
    `/negotiations/${negotiationId}/reject`,
    { method: 'POST' },
  );
  return res.negotiation;
}

/** Ephemeral Négo-Coach advice for a pending negotiation (requester's turn only). */
export async function coachAdvice(negotiationId: number): Promise<BdCoachVerdict> {
  const res = await apiFetch<{ success: boolean; coach: BdCoachVerdict }>(
    `/negotiations/${negotiationId}/coach`,
    { method: 'POST' },
  );
  return res.coach;
}

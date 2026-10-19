/** Reports and blocks (Phase 3 · trust & safety). */
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiErrorMessage, apiFetch } from '@/lib/api';
import type { BdBlockedUser, BdReportReason, BdReportTarget } from '@/constants/types';

export interface ReportInput {
  targetType: BdReportTarget;
  targetId: number;
  reason: BdReportReason;
  description?: string;
}

export interface ReportResult {
  alreadyReported: boolean;
  reportId: number;
}

/** POST /reports. Resolves with already_reported=true if an open report exists. */
export async function createReport(input: ReportInput): Promise<ReportResult> {
  const res = await apiFetch<{ success: boolean; already_reported: boolean; report_id: number }>('/reports', {
    method: 'POST',
    body: {
      target_type: input.targetType,
      target_id: input.targetId,
      reason: input.reason,
      description: input.description?.trim() || undefined,
    },
  });
  return { alreadyReported: !!res.already_reported, reportId: res.report_id };
}

/** Message for a report failure: by code / status, the server's detail otherwise. */
export function reportErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    // "Already reported" is a 201 with `already_reported: true` (see ReportSheet), not an error.
    if (e.code === 'rate_limited' || e.status === 429) return 'Trop de signalements aujourd’hui. Réessayez demain.';
    if (e.status === 400) return apiErrorMessage(e, 'Vous ne pouvez pas signaler votre propre contenu.');
    if (e.status === 404) return 'Ce contenu n’existe plus.';
  }
  return apiErrorMessage(e, 'Signalement impossible. Réessayez.');
}

export async function blockUser(userId: number): Promise<void> {
  await apiFetch(`/users/${userId}/block`, { method: 'POST' });
}

export async function unblockUser(userId: number): Promise<void> {
  await apiFetch(`/users/${userId}/block`, { method: 'DELETE' });
}

export function blocksQuery() {
  return queryOptions({
    queryKey: ['blocks'],
    queryFn: async () => {
      const res = await apiFetch<{ total: number; blocks: BdBlockedUser[] }>('/users/me/blocks');
      return res.blocks;
    },
    staleTime: 0,
  });
}

/**
 * The message for a refusal between blocked users (`X-Error-Code:
 * user_blocked`), or null for any other error.
 */
export function blockedMessage(e: unknown): string | null {
  if (e instanceof ApiError && e.code === 'user_blocked') {
    return apiErrorMessage(e, 'Vous ne pouvez pas contacter cet utilisateur.');
  }
  return null;
}

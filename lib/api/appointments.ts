/**
 * Appointments (rendez-vous, docs/14): one party proposes a time and an
 * optional place from the chat, the other confirms; confirming reserves the
 * listing. Every write sends the `version` the screen showed — a 409
 * `appointment_changed` means the other party changed it meanwhile.
 */
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiErrorMessage, apiFetch } from '@/lib/api';
import { formatHour, formatMeetingWhen, parseServerDate } from '@/lib/api/transactions';

export type BdAppointmentStatus = 'proposed' | 'confirmed' | 'cancelled' | 'done' | 'expired';

export type BdAppointmentPlace =
  | { kind: 'exact'; address: string; details?: string | null }
  | { kind: 'relative'; name: string; details?: string | null };

export interface BdAppointment {
  id: number;
  post_id: number;
  conversation_id: number;
  buyer_id: number;
  seller_id: number;
  transaction_id: number | null;
  proposed_by_id: number;
  status: BdAppointmentStatus;
  version: number;
  /** Naive UTC ISO string (read with parseServerDate). */
  starts_at: string;
  place: BdAppointmentPlace | null;
  quartier: { id: number; name: string; city: string | null } | null;
  cancelled_by_id: number | null;
  cancel_reason: string | null;
  sale_reported_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  can_confirm: boolean;
  can_edit: boolean;
  can_cancel: boolean;
  can_report_outcome: boolean;
}

export interface AppointmentInput {
  /** ISO with an offset (we send UTC, `toISOString()`). */
  starts_at: string;
  place: BdAppointmentPlace | null;
  quartier_id?: number | null;
}

interface AppointmentResponse {
  success: boolean;
  appointment: BdAppointment;
}

interface AppointmentWithDealResponse extends AppointmentResponse {
  transaction: { id: number; status: string; amount: number; post_id: number } | null;
}

export const appointmentKey = (conversationId: number) => ['appointment', conversationId] as const;

/** The conversation's open appointment, else its latest one, else null. */
export function appointmentQuery(conversationId: number | null | undefined) {
  return queryOptions({
    queryKey: appointmentKey(conversationId ?? 0),
    queryFn: async () =>
      (await apiFetch<{ success: boolean; appointment: BdAppointment | null }>(
        `/conversations/${conversationId}/appointment`,
      )).appointment,
    enabled: !!conversationId && conversationId > 0,
  });
}

export async function proposeAppointment(conversationId: number, body: AppointmentInput): Promise<BdAppointment> {
  return (await apiFetch<AppointmentResponse>(`/conversations/${conversationId}/appointments`, {
    method: 'POST',
    body,
  })).appointment;
}

export async function updateAppointment(a: BdAppointment, body: AppointmentInput): Promise<BdAppointment> {
  return (await apiFetch<AppointmentResponse>(`/appointments/${a.id}`, {
    method: 'PATCH',
    body: { version: a.version, ...body },
  })).appointment;
}

export async function confirmAppointment(a: BdAppointment): Promise<AppointmentWithDealResponse> {
  return apiFetch<AppointmentWithDealResponse>(`/appointments/${a.id}/confirm`, {
    method: 'POST',
    body: { version: a.version },
  });
}

export async function cancelAppointment(a: BdAppointment, reason?: string): Promise<BdAppointment> {
  return (await apiFetch<AppointmentResponse>(`/appointments/${a.id}/cancel`, {
    method: 'POST',
    body: { version: a.version, reason: reason?.trim() || undefined },
  })).appointment;
}

export async function reportOutcome(a: BdAppointment, sold: boolean): Promise<AppointmentWithDealResponse> {
  return apiFetch<AppointmentWithDealResponse>(`/appointments/${a.id}/outcome`, {
    method: 'POST',
    body: { version: a.version, sold },
  });
}

/** True when the screen should re-fetch: the appointment moved on meanwhile. */
export function isStaleAppointmentError(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    (e.code === 'appointment_changed' || e.code === 'appointment_open' || e.code === 'appointment_not_open')
  );
}

export function appointmentErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'appointment_changed':
        return 'Le rendez-vous a été modifié entre-temps. Vérifiez-le avant de continuer.';
      case 'appointment_open':
        return 'Un rendez-vous est déjà en cours : modifiez-le.';
      case 'appointment_not_open':
        return 'Ce rendez-vous n’est plus en cours.';
      case 'appointment_own_proposal':
        return 'Attendez que l’autre partie confirme votre proposition.';
      case 'appointment_in_past':
        return 'Choisissez une heure à venir.';
      case 'appointment_too_far':
        return 'Le rendez-vous doit avoir lieu dans les 60 prochains jours.';
      case 'appointment_place_invalid':
        return apiErrorMessage(e, 'Indiquez le lieu ou l’adresse.');
      case 'appointment_not_started':
        return 'Le rendez-vous n’a pas encore eu lieu.';
      case 'post_already_reserved':
        return 'Trop tard : l’annonce vient d’être réservée.';
      case 'post_unavailable':
        return 'Cette annonce n’est plus disponible.';
      case 'user_blocked':
        return apiErrorMessage(e, 'Vous ne pouvez plus échanger avec ce membre.');
    }
  }
  return apiErrorMessage(e, 'Action impossible. Réessayez.');
}

// --- Pure helpers (formatting) --------------------------------------------

type PlaceLike = { kind?: string; address?: string | null; name?: string | null; details?: string | null };

/** "Rond-point de Louis (devant la pharmacie)", or null. */
export function placeSummary(place: PlaceLike | null | undefined): string | null {
  if (!place) return null;
  const main = (place.kind === 'relative' ? place.name : place.address)?.trim();
  if (!main) return null;
  const details = place.details?.trim();
  return details ? `${main} (${details})` : main;
}

/** "demain à 18 h · Rond-point de Louis", device local time. */
export function appointmentSummary(
  a: { starts_at?: string | null; place?: PlaceLike | null },
  now: Date = new Date(),
): string | null {
  const at = parseServerDate(a.starts_at);
  const parts = [at ? formatMeetingWhen(at, now) : null, placeSummary(a.place)].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export const APPOINTMENT_STATUS_LABEL: Record<BdAppointmentStatus, string> = {
  proposed: 'À confirmer',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  done: 'Vente conclue',
  expired: 'Expiré',
};

/** "18 h → 19 h 30" when only the hour moved the same day, else full "when"s. */
function whenChange(before: Date, after: Date, now: Date): string {
  return before.toDateString() === after.toDateString()
    ? `${formatHour(before)} → ${formatHour(after)}`
    : `${formatMeetingWhen(before, now)} → ${formatMeetingWhen(after, now)}`;
}

/** Sentence for a `system_appointment` chat message (payload.event). */
export function appointmentSentence(
  p: Record<string, any>,
  myId: number | undefined,
  otherName: string,
  now: Date = new Date(),
): string {
  const mine = p.by_user_id != null && p.by_user_id === myId;
  const who = mine ? 'Vous' : otherName;
  const summary = appointmentSummary({ starts_at: p.starts_at, place: p.place }, now);
  switch (p.event) {
    case 'proposed':
      return `${who} ${mine ? 'proposez' : 'propose'} un rendez-vous${summary ? ` : ${summary}` : ''}`;
    case 'updated': {
      const before = parseServerDate(p.previous?.starts_at);
      const after = parseServerDate(p.starts_at);
      const placeBefore = placeSummary(p.previous?.place);
      const placeAfter = placeSummary(p.place);
      const changes = [
        before && after && before.getTime() !== after.getTime() ? whenChange(before, after, now) : null,
        placeBefore !== placeAfter ? (placeAfter ? `lieu : ${placeAfter}` : 'lieu retiré') : null,
      ].filter(Boolean);
      return `${who} ${mine ? 'avez modifié' : 'a modifié'} le rendez-vous${changes.length ? ` : ${changes.join(', ')}` : ''}`;
    }
    case 'confirmed':
      return `Rendez-vous confirmé${summary ? ` : ${summary}` : ''} — annonce réservée`;
    case 'cancelled':
      return `${who} ${mine ? 'avez annulé' : 'a annulé'} le rendez-vous${p.reason ? ` : « ${p.reason} »` : ''}`;
    case 'follow_up':
      return 'La vente a-t-elle eu lieu ?';
    case 'sale_reported':
      return `${who} ${mine ? 'indiquez' : 'indique'} que la vente a eu lieu`;
    case 'sold':
      return 'Vente conclue';
    case 'not_sold':
      return 'Vente non conclue — l’annonce est de nouveau disponible';
    case 'expired':
      return 'Sans réponse après le rendez-vous, la réservation est levée';
    default:
      return summary ? `Rendez-vous : ${summary}` : 'Rendez-vous';
  }
}

/** Text shared with a trusted contact (WhatsApp or the system sheet). */
export function appointmentShareText(
  a: { starts_at: string; place: PlaceLike | null },
  postTitle: string | undefined,
  otherName: string | undefined,
  now: Date = new Date(),
): string {
  return [
    `Rendez-vous BonDeal${postTitle ? ` pour « ${postTitle} »` : ''}`,
    otherName ? `avec ${otherName}` : null,
    appointmentSummary(a, now),
  ].filter(Boolean).join(' — ');
}

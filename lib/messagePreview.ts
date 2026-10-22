// lib/messagePreview.ts — one-line text for chat messages: the system-event
// sentences shown in the chatroom, and the conversation-list preview.
import type { BdChatMessage, BdConversation } from '@/constants/types';
import { meetingSummary } from '@/lib/api/transactions';
import { formatAmount } from '@/lib/format';

export function renderSystemMessage(
  msg: Pick<BdChatMessage, 'kind' | 'payload'>,
  conv: BdConversation | undefined,
  myId: number | undefined,
  now: Date = new Date(),
): string {
  const p = msg.payload ?? {};
  const amt = (v: unknown) => formatAmount(typeof v === 'number' ? v : Number(v));
  const who = (uid: unknown) =>
    uid === myId ? 'Vous' : (conv?.counterparty?.username ?? "L'autre partie");
  switch (msg.kind) {
    case 'system_offer_made':
      return p.by_user_id === myId
        ? `Vous avez fait une offre de ${amt(p.amount)}`
        : `${who(p.by_user_id)} a fait une offre de ${amt(p.amount)}`;
    case 'system_counter':
      return p.by_user_id === myId
        ? `Vous avez proposé ${amt(p.amount)}`
        : `${who(p.by_user_id)} a proposé ${amt(p.amount)}`;
    case 'system_accepted':
      return `Offre acceptée — ${amt(p.amount)}`;
    case 'system_rejected':
      return p.by_user_id === myId ? "Vous avez refusé l'offre" : `${who(p.by_user_id)} a refusé l'offre`;
    case 'system_auto_rejected':
      return "Offre clôturée — l'article a été réservé pour un autre acheteur";
    case 'system_withdrawn':
      return 'Négociation annulée par un administrateur';
    case 'system_meeting_set': {
      const summary = meetingSummary({
        meeting_at: typeof p.meeting_at === 'string' ? p.meeting_at : null,
        meeting_location: typeof p.meeting_location === 'string' ? p.meeting_location : null,
      }, now);
      return summary ? `Rendez-vous fixé : ${summary}` : 'Rendez-vous retiré';
    }
    default:
      return msg.kind;
  }
}

/** Conversation-list preview: "Vous : …" for your own messages, the system
 * sentence for offers, null when there's nothing to show. */
export function lastMessagePreview(
  conv: BdConversation,
  myId: number | undefined,
): string | null {
  const m = conv.last_message;
  if (!m) return null;
  if (m.kind !== 'text') return renderSystemMessage(m, conv, myId);
  const body = (m.body ?? '').replace(/\s+/g, ' ').trim();
  if (!body) return null;
  return m.is_mine ? `Vous : ${body}` : body;
}

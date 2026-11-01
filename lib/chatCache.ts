/**
 * Pure helpers that apply chat events to React Query cache data.
 * Shared by the realtime provider (socket events) and the chatroom
 * (optimistic sends), so both paths dedupe the same way.
 */
import type { QueryClient } from '@tanstack/react-query';
import type { BdChatMessage, BdConversation } from '@/constants/types';
import type { RealtimeMessageEvent } from '@/lib/realtime';

export const messagesKey = (cid: number) => ['conversation', cid, 'messages'] as const;
export const conversationKey = (cid: number) => ['conversation', cid] as const;
export const CONVERSATIONS_KEY = ['conversations'] as const;

let tempSeq = 0;
/** Negative ids never collide with server ids. */
export function nextTempId(): number {
  tempSeq += 1;
  return -(Date.now() * 100 + (tempSeq % 100));
}

export function toChatMessage(e: RealtimeMessageEvent): BdChatMessage {
  return {
    id: e.id,
    conversation_id: e.conversation_id,
    sender_id: e.sender_id,
    kind: e.kind,
    body: e.body,
    payload: e.payload,
    created_at: e.created_at,
    read_at: null,
  };
}

/**
 * Insert a confirmed server message into a chronological list:
 * - no-op if a message with that id is already there;
 * - drops the matching optimistic temp (same sender + body, still pending),
 *   so your own message never appears twice whichever arrives first —
 *   the socket echo or the REST response.
 */
export function mergeServerMessage(
  list: BdChatMessage[] | undefined,
  msg: BdChatMessage,
  myId: number | undefined,
): BdChatMessage[] | undefined {
  if (!list) return list;
  if (list.some((m) => m.id === msg.id)) return list;
  let next = list;
  if (msg.kind === 'text' && msg.sender_id != null && msg.sender_id === myId) {
    const idx = list.findIndex(
      (m) => m.id < 0 && m.client_status === 'sending' && m.body === msg.body,
    );
    if (idx >= 0) next = [...list.slice(0, idx), ...list.slice(idx + 1)];
  }
  // Confirmed messages are ordered by id; pending temps stay at the end.
  const confirmed = next.filter((m) => m.id > 0);
  const temps = next.filter((m) => m.id < 0);
  let i = confirmed.length;
  while (i > 0 && confirmed[i - 1].id > msg.id) i -= 1;
  return [...confirmed.slice(0, i), msg, ...confirmed.slice(i), ...temps];
}

/**
 * Move the conversation to the top with the new timestamp and preview; bump its unread
 * count for messages from the other party unless it's the open chatroom.
 * Returns `null` when the conversation isn't in the list (caller refetches).
 */
export function bumpConversation(
  list: BdConversation[] | undefined,
  msg: Pick<BdChatMessage, 'conversation_id' | 'sender_id' | 'created_at'> &
    Partial<Pick<BdChatMessage, 'id' | 'kind' | 'body' | 'payload' | 'read_at'>>,
  myId: number | undefined,
  activeConversationId: number | null,
): BdConversation[] | null | undefined {
  if (!list) return list;
  const idx = list.findIndex((c) => c.id === msg.conversation_id);
  if (idx < 0) return null;
  const conv = list[idx];
  const fromOther = msg.sender_id != null && msg.sender_id !== myId;
  const isOpen = activeConversationId === msg.conversation_id;
  const updated: BdConversation = {
    ...conv,
    last_message_at: msg.created_at ?? new Date().toISOString(),
    // The list preview follows the socket; a bare event keeps the old one.
    last_message:
      msg.id != null && msg.kind
        ? {
            id: msg.id,
            sender_id: msg.sender_id,
            kind: msg.kind,
            body: msg.body ?? null,
            payload: msg.payload ?? null,
            created_at: msg.created_at,
            read_at: msg.read_at ?? null,
            is_mine: msg.sender_id != null && msg.sender_id === myId,
          }
        : conv.last_message,
    unread_count: fromOther && !isOpen ? conv.unread_count + 1 : conv.unread_count,
  };
  return [updated, ...list.slice(0, idx), ...list.slice(idx + 1)];
}

/** Total unread across conversations (Chat tab badge). */
export function totalUnread(list: BdConversation[] | undefined): number {
  return (list ?? []).reduce((n, c) => n + (c.unread_count || 0), 0);
}

/** Zero a conversation's unread count locally (optimistic mark-as-read). */
export function clearUnread(qc: QueryClient, cid: number) {
  qc.setQueryData<BdConversation[]>(CONVERSATIONS_KEY, (old) =>
    old?.map((c) => (c.id === cid ? { ...c, unread_count: 0 } : c)),
  );
}

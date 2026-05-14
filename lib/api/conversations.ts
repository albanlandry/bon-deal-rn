import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BdConversation, BdChatMessage } from '@/constants/types';

interface ConversationsListResponse {
  success: boolean;
  total: number;
  offset: number;
  limit: number;
  conversations: BdConversation[];
}

interface ConversationResponse {
  success: boolean;
  conversation: BdConversation;
}

interface MessagesResponse {
  success: boolean;
  conversation_id: number;
  messages: BdChatMessage[];
  has_more: boolean;
}

interface SendMessageResponse {
  success: boolean;
  message: BdChatMessage;
}

export function conversationsQuery() {
  return queryOptions({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await apiFetch<ConversationsListResponse>('/conversations');
      return res.conversations;
    },
  });
}

export function conversationQuery(id: number) {
  return queryOptions({
    queryKey: ['conversation', id],
    queryFn: async () => {
      const res = await apiFetch<ConversationResponse>(`/conversations/${id}`);
      return res.conversation;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function messagesQuery(id: number) {
  return queryOptions({
    queryKey: ['conversation', id, 'messages'],
    queryFn: async () => {
      const res = await apiFetch<MessagesResponse>(`/conversations/${id}/messages`);
      return res.messages;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** Idempotent — returns the (post, buyer) thread, creating it if absent. */
export async function getOrCreateConversation(postId: number): Promise<BdConversation> {
  const res = await apiFetch<ConversationResponse>('/conversations', {
    method: 'POST',
    body: { post_id: postId },
  });
  return res.conversation;
}

export async function sendMessage(
  conversationId: number,
  body: string,
): Promise<BdChatMessage> {
  const res = await apiFetch<SendMessageResponse>(
    `/conversations/${conversationId}/messages`,
    { method: 'POST', body: { body } },
  );
  return res.message;
}

export async function markConversationRead(conversationId: number): Promise<void> {
  await apiFetch(`/conversations/${conversationId}/read`, { method: 'POST' });
}

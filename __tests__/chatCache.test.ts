import { bumpConversation, mergeServerMessage, nextTempId, totalUnread } from '@/lib/chatCache';
import type { BdChatMessage, BdConversation } from '@/constants/types';

const msg = (id: number, over: Partial<BdChatMessage> = {}): BdChatMessage =>
  ({ id, conversation_id: 1, sender_id: 10, kind: 'text', body: `m${id}`, payload: null,
     created_at: '2026-10-20T10:00:00Z', read_at: null, ...over }) as BdChatMessage;

describe('mergeServerMessage', () => {
  it('ignores a message it already has (socket and REST both deliver it)', () => {
    const list = [msg(1), msg(2)];
    expect(mergeServerMessage(list, msg(2), 99)).toBe(list);
  });

  it('replaces my optimistic message instead of showing it twice', () => {
    const temp = msg(nextTempId(), { sender_id: 5, body: 'Bonjour', client_status: 'sending' } as Partial<BdChatMessage>);
    const merged = mergeServerMessage([msg(1), temp], msg(7, { sender_id: 5, body: 'Bonjour' }), 5)!;
    expect(merged.map((m) => m.id)).toEqual([1, 7]);
  });

  it('keeps messages in id order, with pending ones last', () => {
    const temp = msg(-1, { client_status: 'sending' } as Partial<BdChatMessage>);
    const merged = mergeServerMessage([msg(1), msg(3), temp], msg(2), 99)!;
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3, -1]);
  });
});

describe('bumpConversation', () => {
  const conv = (id: number, unread = 0) => ({ id, unread_count: unread, last_message_at: null }) as unknown as BdConversation;

  it('moves the conversation to the top and counts unread from the other party', () => {
    const out = bumpConversation([conv(1), conv(2, 1)], { conversation_id: 2, sender_id: 8, created_at: 'x' }, 5, null)!;
    expect(out.map((c) => c.id)).toEqual([2, 1]);
    expect(out[0].unread_count).toBe(2);
  });

  it('does not count my own messages or the open chatroom', () => {
    expect(bumpConversation([conv(2, 1)], { conversation_id: 2, sender_id: 5, created_at: 'x' }, 5, null)![0].unread_count).toBe(1);
    expect(bumpConversation([conv(2, 1)], { conversation_id: 2, sender_id: 8, created_at: 'x' }, 5, 2)![0].unread_count).toBe(1);
  });

  it('replaces the list preview with the new message', () => {
    const msg = { id: 41, conversation_id: 2, sender_id: 5, created_at: 'x', kind: 'text' as const, body: 'Ok', payload: null, read_at: null };
    const last = bumpConversation([conv(2)], msg, 5, null)![0].last_message!;
    expect(last).toMatchObject({ id: 41, body: 'Ok', is_mine: true });
    // An event without the message itself keeps the previous preview.
    const before = { ...conv(2), last_message: last };
    expect(bumpConversation([before], { conversation_id: 2, sender_id: 8, created_at: 'y' }, 5, null)![0].last_message).toBe(last);
  });

  it('asks for a refetch when the conversation is unknown', () => {
    expect(bumpConversation([conv(1)], { conversation_id: 9, sender_id: 8, created_at: 'x' }, 5, null)).toBeNull();
  });

  it('totals unread counts for the tab badge', () => {
    expect(totalUnread([conv(1, 2), conv(2, 3)])).toBe(5);
    expect(totalUnread(undefined)).toBe(0);
  });
});

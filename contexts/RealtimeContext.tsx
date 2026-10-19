/**
 * RealtimeProvider — owns the WebSocket lifecycle and applies incoming chat
 * events to the React Query caches:
 *   - appends to the open chatroom's messages (dedupe by id + optimistic temp),
 *   - bumps the conversation list order / timestamps,
 *   - updates unread badges (per conversation, Chat tab total),
 *   - refreshes negotiation state on `system_*` events.
 * On every (re)connect it invalidates chat queries to catch up on anything
 * missed while disconnected. Screens poll only while `connected` is false.
 */
import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { realtime, RealtimeStatus } from '@/lib/realtime';
import {
  bumpConversation,
  CONVERSATIONS_KEY,
  conversationKey,
  mergeServerMessage,
  messagesKey,
  toChatMessage,
} from '@/lib/chatCache';
import type { BdChatMessage, BdConversation } from '@/constants/types';

interface RealtimeContextValue {
  status: RealtimeStatus;
  connected: boolean;
  /** Chatroom registers itself so its messages don't count as unread. */
  setActiveConversation: (cid: number | null) => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'idle',
  connected: false,
  setActiveConversation: () => {},
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<RealtimeStatus>(realtime.getStatus());
  const activeRef = useRef<number | null>(null);
  const myIdRef = useRef<number | undefined>(user?.id);
  myIdRef.current = user?.id;

  // Connect when signed in, disconnect on sign-out.
  useEffect(() => {
    if (isAuthenticated) realtime.start();
    else realtime.stop();
  }, [isAuthenticated]);

  useEffect(() => () => realtime.stop(), []);

  useEffect(() => realtime.onStatus(setStatus), []);

  // Catch up after (re)connecting: anything sent while we were offline.
  useEffect(
    () =>
      realtime.onReady(({ reconnect }) => {
        qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
        if (reconnect || activeRef.current) {
          qc.invalidateQueries({ queryKey: ['conversation'] });
        }
      }),
    [qc],
  );

  useEffect(
    () =>
      realtime.onMessage((event) => {
        const msg = toChatMessage(event);
        const cid = msg.conversation_id;
        const myId = myIdRef.current;

        // 1. Open (or cached) thread: append, deduped.
        qc.setQueryData<BdChatMessage[]>(messagesKey(cid), (old) =>
          mergeServerMessage(old, msg, myId),
        );

        // 2. Conversation list: reorder + unread badge.
        let missing = false;
        qc.setQueryData<BdConversation[]>(CONVERSATIONS_KEY, (old) => {
          const next = bumpConversation(old, msg, myId, activeRef.current);
          if (next === null) {
            missing = true;
            return old;
          }
          return next;
        });
        if (missing) qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });

        // 3. Negotiation events change the conversation's negotiation summary.
        if (msg.kind.startsWith('system_')) {
          qc.invalidateQueries({ queryKey: conversationKey(cid), exact: true });
          qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
          qc.invalidateQueries({ queryKey: ['negotiation'] });
          qc.invalidateQueries({ queryKey: ['posts', 'mine'] });
        }

        // 4. The backend also creates in-app notifications for these events.
        if (msg.sender_id !== myId) {
          qc.invalidateQueries({ queryKey: ['notifications'] });
        }
      }),
    [qc],
  );

  const setActiveConversation = useCallback((cid: number | null) => {
    activeRef.current = cid;
  }, []);

  const value = useMemo(
    () => ({ status, connected: status === 'open', setActiveConversation }),
    [status, setActiveConversation],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

/** Polling interval to use only while the socket is down. */
export function useFallbackInterval(ms: number): number | false {
  const { connected } = useRealtime();
  return connected ? false : ms;
}

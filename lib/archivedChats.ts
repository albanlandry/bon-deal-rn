/**
 * Local "archive" for conversations (swipe to archive in the chat list).
 * TODO(backend): there is no archive endpoint yet; archived ids live in
 * AsyncStorage on this device only. A conversation comes back to the inbox
 * automatically when a newer message arrives after it was archived.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'bondeal.chat.archived.v1';
type ArchiveMap = Record<string, string>; // conversation id → archived at (ISO)

export function useArchivedConversations() {
  const [map, setMap] = useState<ArchiveMap>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setMap(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const persist = (next: ArchiveMap) => {
    setMap(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  const archive = useCallback(
    (id: number) => persist({ ...map, [id]: new Date().toISOString() }),
    [map],
  );
  const unarchive = useCallback(
    (id: number) => {
      const next = { ...map };
      delete next[id];
      persist(next);
    },
    [map],
  );
  const isArchived = useCallback(
    (id: number, lastMessageAt: string | null) => {
      const at = map[id];
      if (!at) return false;
      return !lastMessageAt || new Date(lastMessageAt).getTime() <= new Date(at).getTime();
    },
    [map],
  );

  return { archive, unarchive, isArchived };
}

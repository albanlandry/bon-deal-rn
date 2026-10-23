/**
 * Where a notification leads — shared by the notifications screen and push
 * taps. A push carries the same fields as strings (FCM data), so every id is
 * read through `toId`.
 */
import { router, type Href } from 'expo-router';

import { filtersToRouteParams, savedSearchesQuery } from '@/lib/api/savedSearches';
import { queryClient } from '@/lib/queryClient';

export type NotificationLike = {
  type?: string | null;
  conversation_id?: number | string | null;
  payload?: Record<string, unknown> | null;
};

function toId(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The screen to open, `'saved_search'` when the target needs the saved search
 * looked up first, or null when the notification has no target.
 */
export function notificationHref(n: NotificationLike): Href | 'saved_search' | null {
  const p = n.payload ?? {};
  const postId = toId(p.post_id);
  switch (n.type) {
    case 'staff_warning':
      return null;
    case 'listing_expiring':
    case 'listing_expired':
      return '/my-listings';
    case 'saved_search_match':
      if (Number(p.count) === 1 && postId != null) {
        return { pathname: '/item-details', params: { id: String(postId) } };
      }
      return 'saved_search';
  }
  const transactionId = toId(p.transaction_id);
  if (n.type === 'meeting_set' && transactionId != null) {
    return { pathname: '/deal', params: { id: String(transactionId) } };
  }
  const conversationId = toId(n.conversation_id);
  if (conversationId != null) {
    return { pathname: '/chatroom', params: { conversationId: String(conversationId) } };
  }
  if (postId != null) return { pathname: '/item-details', params: { id: String(postId) } };
  return null;
}

// Saved-search alert: replay the search, or fall back to the list.
async function openSavedSearchMatch(savedSearchId: number | null): Promise<void> {
  try {
    const list = await queryClient.fetchQuery(savedSearchesQuery());
    const ss = list.find((x) => x.id === savedSearchId);
    if (ss) {
      router.push({ pathname: '/search-results', params: filtersToRouteParams(ss.filters) });
      return;
    }
  } catch {
    // fall through to the list
  }
  router.push('/saved-searches' as Href);
}

/** Opens the notification's target. Returns false when it has none. */
export function openNotificationTarget(n: NotificationLike): boolean {
  const href = notificationHref(n);
  if (href == null) return false;
  if (href === 'saved_search') {
    openSavedSearchMatch(toId(n.payload?.saved_search_id));
  } else {
    router.push(href);
  }
  return true;
}

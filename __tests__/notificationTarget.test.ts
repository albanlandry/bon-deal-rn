jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/queryClient', () => ({ queryClient: { fetchQuery: jest.fn() } }));
jest.mock('@/lib/api/savedSearches', () => ({ savedSearchesQuery: jest.fn(), filtersToRouteParams: jest.fn() }));

import { notificationHref } from '@/lib/notificationTarget';

describe('notificationHref', () => {
  it('opens the deal for a meeting, from a row or a push (string ids)', () => {
    const deal = { pathname: '/deal', params: { id: '12' } };
    expect(notificationHref({ type: 'meeting_set', conversation_id: 3, payload: { transaction_id: 12 } })).toEqual(deal);
    expect(notificationHref({ type: 'meeting_set', conversation_id: '3', payload: { transaction_id: '12' } })).toEqual(deal);
  });

  it('opens the chat when there is a conversation', () => {
    expect(notificationHref({ type: 'offer_received', conversation_id: '9', payload: { post_id: '4' } }))
      .toEqual({ pathname: '/chatroom', params: { conversationId: '9' } });
  });

  it('treats an empty push id as missing and falls back to the listing', () => {
    expect(notificationHref({ type: 'offer_accepted', conversation_id: '', payload: { post_id: '4' } }))
      .toEqual({ pathname: '/item-details', params: { id: '4' } });
  });

  it('routes saved-search alerts and listing expiry', () => {
    expect(notificationHref({ type: 'saved_search_match', payload: { count: '1', post_id: '5' } }))
      .toEqual({ pathname: '/item-details', params: { id: '5' } });
    expect(notificationHref({ type: 'saved_search_match', payload: { count: '3', saved_search_id: '2' } })).toBe('saved_search');
    expect(notificationHref({ type: 'listing_expired', payload: { post_id: '5' } })).toBe('/my-listings');
  });

  it('has no target for a staff warning or a bare notification', () => {
    expect(notificationHref({ type: 'staff_warning', payload: { post_id: '5' } })).toBeNull();
    expect(notificationHref({ type: 'offer_rejected', conversation_id: '', payload: {} })).toBeNull();
  });
});

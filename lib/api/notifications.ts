import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BdNotification } from '@/constants/types';

interface NotificationsResponse {
  success: boolean;
  total: number;
  unread_count: number;
  offset: number;
  limit: number;
  notifications: BdNotification[];
}

interface UnreadCountResponse {
  success: boolean;
  unread_count: number;
}

export function notificationsQuery() {
  return queryOptions({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<NotificationsResponse>('/notifications'),
  });
}

export function unreadCountQuery() {
  return queryOptions({
    queryKey: ['notifications', 'unread_count'],
    queryFn: async () => {
      const res = await apiFetch<UnreadCountResponse>('/notifications/unread_count');
      return res.unread_count;
    },
  });
}

export async function markRead(id: number): Promise<void> {
  await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllRead(): Promise<void> {
  await apiFetch('/notifications/read_all', { method: 'POST' });
}

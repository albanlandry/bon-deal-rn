// app/notifications.tsx — Notifications grouped by day, icon per type, deep links.
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, ErrorState, ScreenHeader, showToast, Skeleton } from '@/components/ui';
import type { BdNotification } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { markAllRead, markRead, notificationsQuery } from '@/lib/api/notifications';
import { formatDayLabel, formatRelativeTime } from '@/lib/format';
import { ColorTokens, createStyles, useStyles, useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type BdNotificationsResponseLike = { unread_count: number; notifications: BdNotification[] };

function iconFor(type: string): { name: IconName; color: keyof ColorTokens; tint: keyof ColorTokens } {
  switch (type) {
    case 'new_message':
      return { name: 'chatbubble-outline', color: 'brandStrong', tint: 'brandTint' };
    case 'offer_received':
      return { name: 'pricetag-outline', color: 'trust', tint: 'trustTint' };
    case 'counter_received':
      return { name: 'swap-horizontal-outline', color: 'warning', tint: 'warningTint' };
    case 'offer_accepted':
      return { name: 'checkmark-circle-outline', color: 'success', tint: 'successTint' };
    case 'offer_rejected':
    case 'offer_auto_rejected':
      return { name: 'close-circle-outline', color: 'danger', tint: 'dangerTint' };
    case 'negotiation_cancelled':
      return { name: 'ban-outline', color: 'inkMuted', tint: 'surfaceAlt' };
    default:
      return { name: 'notifications-outline', color: 'inkMuted', tint: 'surfaceAlt' };
  }
}

export default function NotificationsScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...notificationsQuery(),
    enabled: isAuthenticated,
  });

  const notifications: BdNotification[] = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const sections = useMemo(() => {
    const groups: { title: string; data: BdNotification[] }[] = [];
    for (const n of notifications) {
      const title = formatDayLabel(n.created_at);
      const last = groups[groups.length - 1];
      if (last && last.title === title) last.data.push(n);
      else groups.push({ title, data: [n] });
    }
    return groups;
  }, [notifications]);

  // Optimistic read state (Doherty).
  const setReadLocally = (ids: number[] | 'all') => {
    const now = new Date().toISOString();
    queryClient.setQueryData<BdNotificationsResponseLike>(['notifications'], (old) =>
      old
        ? {
            ...old,
            unread_count:
              ids === 'all' ? 0 : Math.max(0, old.unread_count - old.notifications.filter((n) => ids.includes(n.id) && !n.read_at).length),
            notifications: old.notifications.map((n) =>
              (ids === 'all' || ids.includes(n.id)) && !n.read_at ? { ...n, read_at: now } : n,
            ),
          }
        : old,
    );
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markRead(id),
    onMutate: (id) => setReadLocally([id]),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(),
    onMutate: () => setReadLocally('all'),
    onSuccess: () => showToast.success('Tout est lu'),
    onError: (e: any) => showToast.error('Échec', e?.message || 'Veuillez réessayer.'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const targetOf = (item: BdNotification): (() => void) | null => {
    if (item.conversation_id) {
      return () =>
        router.push({ pathname: '/chatroom', params: { conversationId: String(item.conversation_id) } });
    }
    const postId = item.payload?.post_id;
    if (postId != null && Number.isFinite(Number(postId))) {
      return () => router.push({ pathname: '/item-details', params: { id: String(postId) } });
    }
    return null;
  };

  const handlePress = (item: BdNotification) => {
    if (!item.read_at) markReadMutation.mutate(item.id);
    targetOf(item)?.();
  };

  const renderItem = ({ item }: { item: BdNotification }) => {
    const icon = iconFor(item.type);
    const unread = !item.read_at;
    const hasTarget = !!targetOf(item);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${unread ? 'Non lu. ' : ''}${item.title}. ${item.body}`}
        accessibilityHint={hasTarget ? 'Ouvre la conversation ou l’annonce' : undefined}
        onPress={() => handlePress(item)}
        style={({ pressed }) => [s.row, unread && s.rowUnread, pressed && s.pressed]}>
        <View style={[s.icon, { backgroundColor: t.colors[icon.tint] }]}>
          <Ionicons name={icon.name} size={20} color={t.colors[icon.color]} />
        </View>
        <View style={s.flex}>
          <View style={s.titleRow}>
            <AppText variant={unread ? 'labelStrong' : 'label'} style={s.flex} numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText variant="caption" color="inkSubtle">
              {formatRelativeTime(item.created_at)}
            </AppText>
          </View>
          <AppText variant="small" color="inkMuted" numberOfLines={2}>
            {item.body}
          </AppText>
        </View>
        {unread ? (
          <View style={s.dot} accessibilityElementsHidden />
        ) : hasTarget ? (
          <Ionicons name="chevron-forward" size={16} color={t.colors.inkSubtle} />
        ) : null}
      </Pressable>
    );
  };

  let body: React.ReactNode;
  if (authLoading || (isAuthenticated && isLoading)) {
    body = (
      <View style={s.skeletons}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={s.row}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={[s.flex, { gap: 8 }]}>
              <Skeleton width="60%" height={14} />
              <Skeleton width="90%" height={12} />
            </View>
          </View>
        ))}
      </View>
    );
  } else if (!isAuthenticated) {
    body = (
      <EmptyState
        icon="lock-closed-outline"
        title="Connectez-vous"
        message="Connectez-vous pour voir vos notifications."
        actionLabel="Se connecter"
        onAction={() => router.push('/login')}
      />
    );
  } else if (error && notifications.length === 0) {
    body = <ErrorState message="Impossible de charger les notifications." onRetry={() => refetch()} />;
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <AppText variant="captionStrong" color="inkMuted" style={s.sectionHeader} accessibilityRole="header">
            {section.title.toUpperCase()}
          </AppText>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[s.list, notifications.length === 0 && s.grow]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[t.colors.brandStrong]}
            tintColor={t.colors.brandStrong}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="Rien de neuf"
            message="Les messages, offres et réponses à vos annonces apparaîtront ici."
          />
        }
      />
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : undefined}
        right={
          unreadCount > 0 ? (
            <Button
              label="Tout lire"
              variant="ghost"
              size="sm"
              icon="checkmark-done"
              onPress={() => markAllMutation.mutate()}
              loading={markAllMutation.isPending}
            />
          ) : undefined
        }
      />
      {body}
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  list: { paddingBottom: t.spacing.xxl },
  skeletons: { paddingTop: t.spacing.md },
  sectionHeader: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.xs,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: 64,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
    backgroundColor: t.colors.canvas,
  },
  rowUnread: { backgroundColor: t.colors.surface },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.brand },
}));

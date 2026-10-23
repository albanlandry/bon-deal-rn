// app/notifications.tsx — Notifications grouped by day (sticky headers), a
// fixed icon + hue per type (category mnemonic when the payload names one),
// swipe right to mark read, deep links (docs/09 §4 Notifications). "Tout lire"
// is a pill in the thumb zone; an unread dot pops once when it appears.
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  CategoryTag,
  EmptyState,
  ErrorState,
  FadeInView,
  PressableScale,
  ScreenHeader,
  showToast,
  Skeleton,
  SwipeRow,
  useFirstPaint,
} from '@/components/ui';
import { CATEGORY_META } from '@/constants/catalog';
import type { BdNotification } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { markAllRead, markRead, notificationsQuery } from '@/lib/api/notifications';
import { formatDayLabel, formatRelativeTime } from '@/lib/format';
import { notificationHref, openNotificationTarget } from '@/lib/notificationTarget';
import { ColorTokens, createStyles, useStyles, useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import { enterFromBottom, exitDown, spring, timing } from '@/components/motion/anim';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type BdNotificationsResponseLike = { unread_count: number; notifications: BdNotification[] };

function iconFor(type: string): { name: IconName; color: keyof ColorTokens; tint: keyof ColorTokens } {
  switch (type) {
    case 'new_message':
      return { name: 'chatbubble', color: 'brandStrong', tint: 'brandTint' };
    case 'offer_received':
      return { name: 'pricetag', color: 'trust', tint: 'trustTint' };
    case 'counter_received':
      return { name: 'swap-horizontal', color: 'warning', tint: 'warningTint' };
    case 'offer_accepted':
      return { name: 'checkmark-circle', color: 'success', tint: 'successTint' };
    case 'offer_rejected':
    case 'offer_auto_rejected':
      return { name: 'close-circle', color: 'danger', tint: 'dangerTint' };
    case 'negotiation_cancelled':
      return { name: 'ban', color: 'inkMuted', tint: 'surfaceAlt' };
    case 'staff_warning':
      return { name: 'shield', color: 'warning', tint: 'warningTint' };
    case 'listing_expiring':
      return { name: 'hourglass', color: 'warning', tint: 'warningTint' };
    case 'listing_expired':
      return { name: 'time', color: 'inkMuted', tint: 'surfaceAlt' };
    case 'saved_search_match':
      return { name: 'bookmark', color: 'trust', tint: 'trustTint' };
    case 'meeting_set':
    case 'appointment':
      return { name: 'calendar', color: 'brandStrong', tint: 'brandTint' };
    case 'post_available_again':
      return { name: 'refresh-circle', color: 'success', tint: 'successTint' };
    default:
      return { name: 'notifications', color: 'inkMuted', tint: 'surfaceAlt' };
  }
}

/** Unread dot: pops once (1 → 1.4 → 1) when it appears, like the chat list's. Never loops. */
function UnreadDot() {
  const s = useStyles(makeStyles);
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(timing(1.4, duration.short, 'standard'), spring(1, 'fast'));
  }, [scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[s.dot, anim]} accessibilityElementsHidden />;
}

export default function NotificationsScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...notificationsQuery(),
    enabled: isAuthenticated,
  });

  const notifications: BdNotification[] = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const firstPaint = useFirstPaint(notifications.length > 0);
  const order = useMemo(() => new Map(notifications.map((n, i) => [n.id, i])), [notifications]);

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

  const handlePress = (item: BdNotification) => {
    if (!item.read_at) markReadMutation.mutate(item.id);
    openNotificationTarget(item);
  };

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: BdNotification;
    index: number;
    section: { data: BdNotification[] };
  }) => {
    const first = index === 0;
    const last = index === section.data.length - 1;
    const icon = iconFor(item.type);
    const unread = !item.read_at;
    const hasTarget = notificationHref(item) != null;
    const rawCat = item.payload?.category ?? item.payload?.categories?.[0];
    const category = typeof rawCat === 'string' && CATEGORY_META[rawCat] ? rawCat : null;
    return (
      <FadeInView index={order.get(item.id) ?? 99} animate={firstPaint}>
        <SwipeRow
          style={[s.groupItem, first && s.groupFirst, last && s.groupLast]}
          enabled={unread}
          left={
            unread
              ? {
                  label: 'Marquer lu',
                  icon: 'checkmark-done',
                  color: t.colors.trust,
                  onColor: t.colors.onDanger, // same pair as on `trust`: white (light), ink (dark)
                  onAction: () => markReadMutation.mutate(item.id),
                }
              : undefined
          }>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${unread ? 'Non lu. ' : ''}${item.title}. ${item.body}`}
            accessibilityHint={hasTarget ? 'Ouvre l’élément concerné' : undefined}
            accessibilityActions={unread ? [{ name: 'markRead', label: 'Marquer comme lu' }] : undefined}
            onAccessibilityAction={(e) => e.nativeEvent.actionName === 'markRead' && markReadMutation.mutate(item.id)}
            scaleTo={0.98}
            onPress={() => handlePress(item)}
            style={[s.row, last && s.rowLast]}>
            <View>
              <View style={[s.icon, { backgroundColor: t.colors[icon.tint] }]}>
                <Ionicons name={icon.name} size={20} color={t.colors[icon.color]} />
              </View>
              {category && <CategoryTag value={category} iconOnly size={22} style={[s.catBadge, { borderColor: t.colors.surface }]} />}
            </View>
            <View style={s.flex}>
              <View style={s.titleRow}>
                <AppText variant={unread ? 'bodyStrong' : 'body'} style={s.flex} numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color="inkMuted">
                  {formatRelativeTime(item.created_at)}
                </AppText>
              </View>
              <AppText variant="small" color="inkMuted" numberOfLines={item.type === 'staff_warning' ? undefined : 2}>
                {item.type === 'staff_warning' && item.payload?.message ? item.payload.message : item.body}
              </AppText>
              {item.type === 'staff_warning' && (
                <AppText variant="caption" color="warning" style={s.warnNote}>
                  Message de l’équipe de modération BonDeal
                </AppText>
              )}
            </View>
            {unread ? (
              <UnreadDot />
            ) : hasTarget ? (
              <Ionicons name="chevron-forward" size={16} color={t.colors.inkSubtle} />
            ) : null}
          </PressableScale>
        </SwipeRow>
      </FadeInView>
    );
  };

  let body: React.ReactNode;
  if (authLoading || (isAuthenticated && isLoading)) {
    body = (
      <View style={s.skeletons}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={s.row}>
            <Skeleton width={40} height={40} radius={t.radius.sm} />
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
          <View style={s.sectionHeader}>
            <AppText variant="captionStrong" color="inkMuted" style={s.sectionText} accessibilityRole="header">
              {section.title.toUpperCase()}
            </AppText>
          </View>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={[s.list, unreadCount > 0 && s.listWithPill, notifications.length === 0 && s.grow]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[t.colors.brandStrong]}
            tintColor={t.colors.brandStrong}
            progressBackgroundColor={t.colors.surface}
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
        large
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : undefined}
      />
      {body}
      {isAuthenticated && unreadCount > 0 && (
        <Animated.View
          entering={enterFromBottom()}
          exiting={exitDown()}
          pointerEvents="box-none"
          style={[s.pillWrap, { bottom: insets.bottom + t.spacing.md }]}>
          <Button
            label="Tout marquer comme lu"
            icon="checkmark-done"
            variant="secondary"
            onPress={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
            style={s.pill}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  list: { paddingBottom: t.spacing.xxl },
  listWithPill: { paddingBottom: 96 },
  pillWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { backgroundColor: t.colors.surface, ...t.elevation.sheet },
  skeletons: { paddingTop: t.spacing.md, marginHorizontal: t.spacing.md },
  sectionHeader: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.xs,
    backgroundColor: t.colors.canvas,
  },
  groupItem: {
    marginHorizontal: t.spacing.md,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  groupFirst: { borderTopWidth: 1, borderTopLeftRadius: t.radius.md, borderTopRightRadius: t.radius.md },
  groupLast: { borderBottomWidth: 1, borderBottomLeftRadius: t.radius.md, borderBottomRightRadius: t.radius.md },
  sectionText: { letterSpacing: 0.5 },
  catBadge: { position: 'absolute', right: -4, bottom: -4, borderWidth: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: 64,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  rowLast: { borderBottomWidth: 0 },
  icon: { width: 40, height: 40, borderRadius: t.radius.sm, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  warnNote: { marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.brand },
}));

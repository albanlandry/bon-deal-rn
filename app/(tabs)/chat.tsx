// app/(tabs)/chat.tsx — conversation list (docs/09 §4 Messages, docs/11 §4.4).
// Filter chips Tous · Achats · Ventes · Non lus (client-side), each row shows
// the deal state ("Offre à répondre", "Accord 75 000 FCFA").
// Avatar + listing thumbnail stacked, offer/state chip, an unread dot that
// pulses ONCE on arrival, swipe right → mark read / swipe left → archive
// (local only), rows that move to the top animate with a layout spring.
// Live updates via the realtime provider (WebSocket), pull-to-refresh.
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppImage,
  AppText,
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  FadeInView,
  LargeTitle,
  PressableScale,
  showToast,
  Skeleton,
  SwipeRow,
  useFirstPaint,
  useScrollChrome,
  useTabBarInset,
} from '@/components/ui';
import { enterFade, exitFade, layoutSpring, spring, timing } from '@/components/motion/anim';
import { useAuth } from '@/contexts/AuthContext';
import { useFallbackInterval, useRealtime } from '@/contexts/RealtimeContext';
import { conversationsQuery, markConversationRead } from '@/lib/api/conversations';
import { useArchivedConversations } from '@/lib/archivedChats';
import { clearUnread } from '@/lib/chatCache';
import { formatAmount, formatRelativeTime } from '@/lib/format';
import { lastMessagePreview } from '@/lib/messagePreview';
import type { BdConversation } from '@/constants/types';
import { createStyles, font, Theme, useStyles, useTheme } from '@/theme';
import { duration } from '@/theme/motion';

type ChipTone = 'brand' | 'success' | 'neutral' | 'warning' | 'trust';

type Filter = 'all' | 'buying' | 'selling' | 'unread';

/** Am I the buyer in this conversation? `role` is server-computed; the ids
 *  are the fallback for older payloads. */
function isBuying(c: BdConversation, myId?: number): boolean {
  if (c.role) return c.role === 'buyer';
  return myId != null && c.buyer_id === myId;
}

function matchesFilter(c: BdConversation, f: Filter, myId?: number): boolean {
  if (f === 'buying') return isBuying(c, myId);
  if (f === 'selling') return !isBuying(c, myId);
  if (f === 'unread') return c.unread_count > 0;
  return true;
}

const FILTER_EMPTY: Record<Exclude<Filter, 'all'>, { icon: any; title: string; message: string }> = {
  buying: {
    icon: 'bag-handle-outline',
    title: 'Aucun achat en discussion',
    message: 'Quand vous contactez un vendeur, la conversation apparaît ici.',
  },
  selling: {
    icon: 'pricetags-outline',
    title: 'Aucune vente en discussion',
    message: 'Les acheteurs intéressés par vos annonces vous écriront ici.',
  },
  unread: {
    icon: 'checkmark-done-outline',
    title: 'Vous êtes à jour',
    message: 'Aucun message non lu.',
  },
};

function negotiationChip(c: BdConversation, myId?: number): { text: string; tone: ChipTone; icon: any } | null {
  const n = c.latest_negotiation;
  if (!n) return null;
  if (n.status === 'pending') {
    const mine = n.last_offer_by_id === myId;
    return mine
      ? { text: `En attente · ${formatAmount(n.current_offer_amount)}`, tone: 'neutral', icon: 'hourglass-outline' }
      : { text: `Offre à répondre · ${formatAmount(n.current_offer_amount)}`, tone: 'brand', icon: 'pricetag' };
  }
  if (n.status === 'accepted')
    return { text: `Accord · ${formatAmount(n.accepted_amount)}`, tone: 'trust', icon: 'checkmark-circle' };
  if (n.status === 'rejected') return { text: 'Offre refusée', tone: 'neutral', icon: 'close-circle-outline' };
  return null;
}

/** Unread count dot: pops once (1 → 1.4 → 1) when the count rises. Never loops. */
function UnreadDot({ count }: { count: number }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const s = useSharedValue(1);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) {
      s.value = withSequence(timing(1.4, duration.short, 'standard'), spring(1, 'fast'));
    }
    prev.current = count;
  }, [count, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View entering={enterFade()} exiting={exitFade()} style={[styles.unread, anim]}>
      <AppText variant="captionStrong" style={{ color: t.colors.onBrand }}>
        {count > 99 ? '99+' : count}
      </AppText>
    </Animated.View>
  );
}

function ConversationRow({
  item,
  myId,
  onArchive,
  onMarkRead,
  archived,
}: {
  item: BdConversation;
  myId?: number;
  onArchive: (c: BdConversation) => void;
  onMarkRead: (c: BdConversation) => void;
  archived: boolean;
}) {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const unread = item.unread_count > 0;
  const neg = negotiationChip(item, myId);
  const postState =
    item.post?.state === 'sold' ? 'Vendu' : item.post?.state === 'reserved' ? 'Réservé' : null;
  const name = item.counterparty?.username ?? 'Utilisateur';
  const price = item.post?.is_free
    ? 'Gratuit'
    : item.post?.price != null
      ? formatAmount(item.post.price)
      : null;
  const preview = lastMessagePreview(item, myId);

  return (
    <SwipeRow
      left={
        unread
          ? {
              label: 'Marquer lu',
              icon: 'checkmark-done',
              color: t.colors.trust,
              onColor: t.colors.onDanger, // same pair as on `trust`: white (light), ink (dark)
              onAction: () => onMarkRead(item),
            }
          : undefined
      }
      right={{
        label: archived ? 'Désarchiver' : 'Archiver',
        icon: archived ? 'archive' : 'archive-outline',
        color: t.colors.ink,
        onColor: t.colors.canvas,
        onAction: () => onArchive(item),
      }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Conversation avec ${name} à propos de ${item.post?.title ?? 'un article'}${
          unread ? `, ${item.unread_count} non lus` : ''
        }${preview ? `. Dernier message : ${preview}` : ''}`}
        accessibilityActions={[
          { name: 'archive', label: archived ? 'Désarchiver' : 'Archiver' },
          ...(unread ? [{ name: 'read', label: 'Marquer comme lu' }] : []),
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'archive') onArchive(item);
          if (e.nativeEvent.actionName === 'read') onMarkRead(item);
        }}
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/chatroom', params: { conversationId: String(item.id) } })}
        style={styles.row}>
        {/* Identity first: avatar, with the listing thumbnail stacked on it. */}
        <View style={styles.stack}>
          <Avatar name={name} size={52} />
          <View style={styles.thumbWrap}>
            {item.post?.thumbnail_url ? (
              <AppImage uri={item.post.thumbnail_url} style={styles.thumb} recyclingKey={`c${item.id}`} />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name="cube-outline" size={14} color={t.colors.inkSubtle} />
              </View>
            )}
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.topLine}>
            <AppText variant="body" numberOfLines={1} style={[styles.flex, unread ? styles.nameUnread : styles.name]}>
              {name}
            </AppText>
            <AppText variant={unread ? 'captionStrong' : 'caption'} color={unread ? 'brandStrong' : 'inkSubtle'}>
              {formatRelativeTime(item.last_message_at ?? item.created_at)}
            </AppText>
          </View>
          <View style={styles.topLine}>
            {preview ? (
              <AppText variant="small" color={unread ? 'ink' : 'inkMuted'} numberOfLines={1} style={styles.flex}>
                {preview}
              </AppText>
            ) : (
              <ListingLine title={item.post?.title} price={price} strong={unread} />
            )}
            {unread && <UnreadDot count={item.unread_count} />}
          </View>
          {preview && <ListingLine title={item.post?.title} price={price} caption />}
          {(neg || postState) && (
            <View style={styles.badges}>
              {neg && <Badge label={neg.text} tone={neg.tone} icon={neg.icon} />}
              {postState && (
                <Badge label={postState} tone={postState === 'Vendu' ? 'overlay' : 'warning'} />
              )}
            </View>
          )}
        </View>
      </PressableScale>
    </SwipeRow>
  );
}

/** "Title · price" — the row's second line, or a caption under the preview. */
function ListingLine({
  title,
  price,
  strong,
  caption,
}: {
  title?: string;
  price?: string | null;
  strong?: boolean;
  caption?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const variant = caption ? 'caption' : 'small';
  return (
    <AppText
      variant={variant}
      color={caption ? 'inkSubtle' : strong ? 'ink' : 'inkMuted'}
      numberOfLines={1}
      style={styles.flex}>
      {title ?? 'Article'}
      {price ? (
        <AppText variant={variant} style={[font('700'), { color: caption ? t.colors.inkMuted : t.colors.ink }]}>
          {` · ${price}`}
        </AppText>
      ) : null}
    </AppText>
  );
}

function RowSkeleton() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Skeleton width={52} height={52} radius={26} />
      <View style={[styles.body, { gap: 8 }]}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="80%" height={12} />
      </View>
    </View>
  );
}

const AnimatedFlatList = Animated.FlatList;

export default function ChatScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const queryClient = useQueryClient();
  const tabInset = useTabBarInset();
  const chrome = useScrollChrome({ drivesTabBar: true });
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { status } = useRealtime();
  const pollMs = useFallbackInterval(15_000);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const { archive, unarchive, isArchived } = useArchivedConversations();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...conversationsQuery(),
    enabled: isAuthenticated,
    refetchInterval: pollMs,
  });
  const firstPaint = useFirstPaint(!!data);

  const { inbox, archivedList } = useMemo(() => {
    const all = data ?? [];
    const inboxAll = all.filter((c) => !isArchived(c.id, c.last_message_at));
    const arch = all.filter((c) => isArchived(c.id, c.last_message_at));
    // Unread first, then most recent (server order is last_message_at desc).
    const sorted = [...inboxAll].sort((a, b) => Number(b.unread_count > 0) - Number(a.unread_count > 0));
    return { inbox: sorted, archivedList: arch };
  }, [data, isArchived]);

  const handleArchive = useCallback(
    (c: BdConversation) => {
      if (isArchived(c.id, c.last_message_at)) {
        unarchive(c.id);
        showToast.success('Conversation désarchivée');
        return;
      }
      archive(c.id);
      showToast.undo('Conversation archivée', () => unarchive(c.id), 'Elle reviendra au prochain message.');
    },
    [archive, unarchive, isArchived],
  );

  // Optimistic mark-as-read (same path as opening the room).
  const handleMarkRead = useCallback(
    (c: BdConversation) => {
      clearUnread(queryClient, c.id);
      markConversationRead(c.id).catch(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });
    },
    [queryClient],
  );

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {[0, 1, 2, 3].map((i) => (
          <RowSkeleton key={i} />
        ))}
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          icon="chatbubbles-outline"
          title="Connectez-vous"
          message="Connectez-vous pour discuter avec les vendeurs et acheteurs."
          actionLabel="Se connecter"
          onAction={() => router.push('/login')}
        />
      </SafeAreaView>
    );
  }

  const list = showArchived ? archivedList : inbox.filter((c) => matchesFilter(c, filter, user?.id));
  const offline = status === 'reconnecting' || status === 'connecting';
  const unreadTotal = inbox.reduce((n, c) => n + (c.unread_count > 0 ? 1 : 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <LargeTitle
          style={styles.flex}
          title={showArchived ? 'Archivées' : 'Messages'}
          subtitle={
            !showArchived && unreadTotal > 0 ? (
              <Animated.View entering={enterFade()} exiting={exitFade()}>
                <AppText variant="small" color="inkMuted">
                  {unreadTotal} conversation{unreadTotal > 1 ? 's' : ''} non lue{unreadTotal > 1 ? 's' : ''}
                </AppText>
              </Animated.View>
            ) : undefined
          }
        />
        {showArchived && (
          <Button label="Boîte de réception" variant="ghost" size="sm" icon="arrow-back" onPress={() => setShowArchived(false)} />
        )}
      </View>
      {!showArchived && (data?.length ?? 0) > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
          accessibilityRole="tablist">
          {(
            [
              ['all', 'Tous'],
              ['buying', 'Achats'],
              ['selling', 'Ventes'],
              ['unread', unreadTotal > 0 ? `Non lus · ${unreadTotal}` : 'Non lus'],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <Chip key={value} label={label} kind="choice" selected={filter === value} onPress={() => setFilter(value)} />
          ))}
        </ScrollView>
      )}
      {offline && (
        <View style={[styles.connBanner, { backgroundColor: t.colors.warningTint }]} accessibilityLiveRegion="polite">
          <Ionicons name="cloud-offline-outline" size={14} color={t.colors.warning} />
          <AppText variant="caption" color="ink">
            Connexion en direct interrompue — actualisation automatique.
          </AppText>
        </View>
      )}

      {isLoading ? (
        <View>
          {[0, 1, 2, 3, 4].map((i) => (
            <RowSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <ErrorState message="Impossible de charger les conversations." onRetry={() => refetch()} />
      ) : (
        <AnimatedFlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          // New socket messages move a row to the top: let it glide there.
          itemLayoutAnimation={firstPaint ? undefined : layoutSpring()}
          renderItem={({ item, index }) => (
            <FadeInView index={index} animate={firstPaint}>
              <ConversationRow
                item={item}
                myId={user?.id}
                onArchive={handleArchive}
                onMarkRead={handleMarkRead}
                archived={showArchived}
              />
            </FadeInView>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={[{ paddingBottom: tabInset }, list.length === 0 && styles.emptyContent]}
          onScroll={chrome.onScroll}
          scrollEventThrottle={chrome.scrollEventThrottle}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            showArchived ? (
              <EmptyState icon="archive-outline" title="Aucune conversation archivée" />
            ) : filter !== 'all' ? (
              <EmptyState
                icon={FILTER_EMPTY[filter].icon}
                title={FILTER_EMPTY[filter].title}
                message={FILTER_EMPTY[filter].message}
                actionLabel="Voir toutes les conversations"
                onAction={() => setFilter('all')}
              />
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="Aucune conversation"
                message="Contactez un vendeur depuis une annonce : vos échanges apparaîtront ici."
                actionLabel="Parcourir les annonces"
                onAction={() => router.push('/(tabs)/home')}
              />
            )
          }
          ListFooterComponent={
            !showArchived && archivedList.length > 0 ? (
              <PressableScale
                accessibilityRole="button"
                onPress={() => setShowArchived(true)}
                style={styles.archivedLink}>
                <Ionicons name="archive-outline" size={18} color={t.colors.inkMuted} />
                <AppText variant="label" color="inkMuted">
                  Conversations archivées ({archivedList.length})
                </AppText>
              </PressableScale>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.sm,
    minHeight: 64,
  },
  filtersScroll: { flexGrow: 0 },
  filters: {
    flexDirection: 'row',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.sm,
  },
  connBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    minHeight: 84,
    backgroundColor: t.colors.surface,
  },
  stack: { width: 60, height: 60 },
  thumbWrap: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    borderRadius: t.radius.xs + 2,
    borderWidth: 2,
    borderColor: t.colors.surface,
    backgroundColor: t.colors.surface,
  },
  thumb: { width: 28, height: 28, borderRadius: t.radius.xs },
  thumbFallback: { backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  name: font('500'),
  nameUnread: font('700'),
  badges: { flexDirection: 'row', gap: t.spacing.xs, marginTop: 4, flexWrap: 'wrap' },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    backgroundColor: t.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: 1, backgroundColor: t.colors.line, marginLeft: 92 },
  emptyContent: { flexGrow: 1 },
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
}));

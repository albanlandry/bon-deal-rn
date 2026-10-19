// app/(tabs)/chat.tsx — conversation list.
// Unread first, listing thumbnail, live updates via the realtime provider
// (WebSocket), swipe to archive (local only), pull-to-refresh.
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppImage,
  AppText,
  Avatar,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  showToast,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useFallbackInterval, useRealtime } from '@/contexts/RealtimeContext';
import { conversationsQuery } from '@/lib/api/conversations';
import { useArchivedConversations } from '@/lib/archivedChats';
import { formatAmount, formatRelativeTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { BdConversation } from '@/constants/types';
import { createStyles, Theme, useStyles, useTheme } from '@/theme';

function negotiationLine(c: BdConversation, myId?: number): { text: string; tone: 'brand' | 'success' | 'neutral' } | null {
  const n = c.latest_negotiation;
  if (!n) return null;
  if (n.status === 'pending') {
    const mine = n.last_offer_by_id === myId;
    return {
      text: mine
        ? `Votre offre : ${formatAmount(n.current_offer_amount)}`
        : `Offre reçue : ${formatAmount(n.current_offer_amount)}`,
      tone: mine ? 'neutral' : 'brand',
    };
  }
  if (n.status === 'accepted') return { text: `Accord à ${formatAmount(n.accepted_amount)}`, tone: 'success' };
  return null;
}

function ConversationRow({
  item,
  myId,
  onArchive,
  archived,
}: {
  item: BdConversation;
  myId?: number;
  onArchive: (c: BdConversation) => void;
  archived: boolean;
}) {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const ref = useRef<SwipeableMethods>(null);
  const unread = item.unread_count > 0;
  const neg = negotiationLine(item, myId);
  const postState =
    item.post?.state === 'sold' ? 'Vendu' : item.post?.state === 'reserved' ? 'Réservé' : null;

  const renderAction = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={archived ? 'Désarchiver' : 'Archiver'}
      onPress={() => {
        ref.current?.close();
        onArchive(item);
      }}
      style={[styles.swipeAction, { backgroundColor: t.colors.surfaceAlt }]}>
      <Ionicons name={archived ? 'archive' : 'archive-outline'} size={22} color={t.colors.ink} />
      <AppText variant="captionStrong">{archived ? 'Désarchiver' : 'Archiver'}</AppText>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={56}
      overshootRight={false}
      renderRightActions={renderAction}
      onSwipeableWillOpen={() => haptics.selection()}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Conversation avec ${item.counterparty?.username ?? 'utilisateur'} à propos de ${
          item.post?.title ?? 'un article'
        }${unread ? `, ${item.unread_count} non lus` : ''}`}
        accessibilityActions={[{ name: 'archive', label: archived ? 'Désarchiver' : 'Archiver' }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === 'archive' && onArchive(item)}
        onPress={() =>
          router.push({ pathname: '/chatroom', params: { conversationId: String(item.id) } })
        }
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.colors.surfaceAlt }]}>
        <View>
          {item.post?.thumbnail_url ? (
            <AppImage uri={item.post.thumbnail_url} style={styles.thumb} recyclingKey={String(item.id)} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Ionicons name="cube-outline" size={22} color={t.colors.inkSubtle} />
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <Avatar name={item.counterparty?.username} size={24} />
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.topLine}>
            <AppText variant={unread ? 'bodyStrong' : 'body'} numberOfLines={1} style={styles.flex}>
              {item.counterparty?.username ?? 'Utilisateur'}
            </AppText>
            <AppText variant="caption" color={unread ? 'brandStrong' : 'inkSubtle'}>
              {formatRelativeTime(item.last_message_at ?? item.created_at)}
            </AppText>
          </View>
          <AppText variant="small" color={unread ? 'ink' : 'inkMuted'} numberOfLines={1}>
            {item.post?.title ?? 'Article'}
            {item.post && !item.post.is_free && item.post.price != null
              ? ` · ${formatAmount(item.post.price)}`
              : item.post?.is_free
                ? ' · Gratuit'
                : ''}
          </AppText>
          {(neg || postState) && (
            <View style={styles.badges}>
              {neg && <Badge label={neg.text} tone={neg.tone} />}
              {postState && <Badge label={postState} tone={postState === 'Vendu' ? 'neutral' : 'warning'} />}
            </View>
          )}
        </View>
        {unread && (
          <View style={styles.unread}>
            <AppText variant="captionStrong" style={{ color: t.colors.onBrand }}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </AppText>
          </View>
        )}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

function RowSkeleton() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Skeleton width={56} height={56} radius={12} />
      <View style={[styles.body, { gap: 8 }]}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="80%" height={12} />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { status } = useRealtime();
  const pollMs = useFallbackInterval(15_000);
  const [showArchived, setShowArchived] = useState(false);
  const { archive, unarchive, isArchived } = useArchivedConversations();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...conversationsQuery(),
    enabled: isAuthenticated,
    refetchInterval: pollMs,
  });

  const { inbox, archivedList } = useMemo(() => {
    const all = data ?? [];
    const inboxAll = all.filter((c) => !isArchived(c.id, c.last_message_at));
    const arch = all.filter((c) => isArchived(c.id, c.last_message_at));
    // Unread first, then most recent (server order is last_message_at desc).
    const sorted = [...inboxAll].sort((a, b) => Number(b.unread_count > 0) - Number(a.unread_count > 0));
    return { inbox: sorted, archivedList: arch };
  }, [data, isArchived]);

  const handleArchive = (c: BdConversation) => {
    if (isArchived(c.id, c.last_message_at)) {
      unarchive(c.id);
      showToast.success('Conversation désarchivée');
      return;
    }
    archive(c.id);
    showToast.undo('Conversation archivée', () => unarchive(c.id), 'Elle reviendra au prochain message.');
  };

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

  const list = showArchived ? archivedList : inbox;
  const offline = status === 'reconnecting' || status === 'connecting';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="h1" accessibilityRole="header">
          {showArchived ? 'Archivées' : 'Messages'}
        </AppText>
        {showArchived && (
          <Button label="Boîte de réception" variant="ghost" size="sm" onPress={() => setShowArchived(false)} />
        )}
      </View>
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
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              myId={user?.id}
              onArchive={handleArchive}
              archived={showArchived}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={list.length === 0 ? styles.emptyContent : undefined}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            showArchived ? (
              <EmptyState icon="archive-outline" title="Aucune conversation archivée" />
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
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowArchived(true)}
                style={styles.archivedLink}>
                <Ionicons name="archive-outline" size={18} color={t.colors.inkMuted} />
                <AppText variant="label" color="inkMuted">
                  Conversations archivées ({archivedList.length})
                </AppText>
              </Pressable>
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
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.sm,
  },
  connBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    minHeight: 80,
    backgroundColor: t.colors.canvas,
  },
  thumb: { width: 56, height: 56, borderRadius: t.radius.md },
  thumbFallback: { backgroundColor: t.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarOverlay: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: t.colors.canvas,
  },
  body: { flex: 1, gap: 2 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: t.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.line, marginLeft: 84 },
  swipeAction: { width: 96, alignItems: 'center', justifyContent: 'center', gap: 4 },
  emptyContent: { flexGrow: 1 },
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
  },
}));

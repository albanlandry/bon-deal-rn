// app/notifications.tsx - Notifications Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { showToast } from '../components/atoms/Toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  markAllRead,
  markRead,
  notificationsQuery,
} from '@/lib/api/notifications';
import { formatRelativeTime } from '@/lib/format';
import type { BdNotification } from '@/constants/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function iconFor(type: string): { name: IconName; color: string } {
  switch (type) {
    case 'new_message':
      return { name: 'chatbubble-outline', color: theme.colors.primary };
    case 'offer_received':
      return { name: 'pricetag-outline', color: '#9C27B0' };
    case 'counter_received':
      return { name: 'swap-horizontal-outline', color: '#FF9800' };
    case 'offer_accepted':
      return { name: 'checkmark-circle-outline', color: theme.colors.success };
    case 'offer_rejected':
    case 'offer_auto_rejected':
      return { name: 'close-circle-outline', color: '#FF3B30' };
    case 'negotiation_cancelled':
      return { name: 'ban-outline', color: theme.colors.gray };
    default:
      return { name: 'notifications-outline', color: theme.colors.gray };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...notificationsQuery(),
    enabled: isAuthenticated,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast.success('Notifications marquées comme lues');
    },
    onError: (e: any) => showToast.error('Échec', e?.message || 'Veuillez réessayer.'),
  });

  const handlePress = (item: BdNotification) => {
    if (!item.read_at) markReadMutation.mutate(item.id);
    if (item.conversation_id) {
      router.push({
        pathname: '/chatroom',
        params: { conversationId: String(item.conversation_id) },
      });
    }
  };

  const renderSkeleton = () => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        <View style={styles.skeletonIconContainer} />
        <View style={styles.textContent}>
          <View style={styles.titleRow}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonTimestamp} />
          </View>
          <View style={styles.skeletonMessage} />
        </View>
      </View>
    </View>
  );

  const renderNotification = ({ item }: { item: BdNotification }) => {
    const icon = iconFor(item.type);
    const isRead = !!item.read_at;
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !isRead && styles.unreadNotification]}
        onPress={() => handlePress(item)}>
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>

          <View style={styles.textContent}>
            <View style={styles.titleRow}>
              <Text style={[styles.notificationTitle, !isRead && styles.unreadTitle]}>
                {item.title}
              </Text>
              <Text style={styles.timestamp}>{formatRelativeTime(item.created_at)}</Text>
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.body}
            </Text>
          </View>

          {!isRead && <View style={styles.unreadIndicator} />}
        </View>
      </TouchableOpacity>
    );
  };

  let body: React.ReactNode;
  if (authLoading || isLoading) {
    body = (
      <FlatList
        data={Array(5).fill({})}
        renderItem={renderSkeleton}
        keyExtractor={(_, index) => `skeleton-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  } else if (!isAuthenticated) {
    body = (
      <View style={styles.emptyContainer}>
        <Ionicons name="lock-closed-outline" size={56} color={theme.colors.gray} />
        <Text style={styles.emptyTitle}>Connectez-vous</Text>
        <Text style={styles.emptyMessage}>
          Connectez-vous pour voir vos notifications.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/login')}>
          <Text style={styles.primaryButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={56} color="#FF6B6B" />
        <Text style={styles.emptyMessage}>Impossible de charger les notifications.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => refetch()}>
          <Text style={styles.primaryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.colors.gray} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyMessage}>
              Vous recevrez des notifications ici quand quelqu'un interagit avec vos
              annonces.
            </Text>
          </View>
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.gray} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}>
            {markAllMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.markAllText}>Tout marquer</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.markAllButton} />
        )}
      </View>

      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  backButton: {
    padding: theme.spacing.sm,
    minWidth: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    padding: theme.spacing.sm,
    minWidth: 90,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: theme.spacing.lg,
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  unreadNotification: {
    backgroundColor: '#F8F9FA',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContent: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.gray,
    marginLeft: theme.spacing.sm,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
    marginLeft: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skeletonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: theme.spacing.md,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '60%',
    marginBottom: 4,
  },
  skeletonTimestamp: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '30%',
  },
  skeletonMessage: {
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '90%',
  },
});

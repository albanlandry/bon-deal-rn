// app/(tabs)/chat.tsx - Chat Tab Screen (conversation list)
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import { conversationsQuery } from '@/lib/api/conversations';
import { formatRelativeTime } from '@/lib/format';
import type { BdConversation } from '@/constants/types';

function ConversationRow({ item }: { item: BdConversation }) {
  const router = useRouter();
  const thumb = item.post?.thumbnail_url;
  return (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        router.push({
          pathname: '/chatroom',
          params: { conversationId: String(item.id) },
        })
      }>
      <View style={styles.profileContainer}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.profilePicture}>
            <Ionicons name="cube-outline" size={22} color="#000" />
          </View>
        )}
      </View>

      <View style={styles.messageContainer}>
        <View style={styles.messageHeader}>
          <Text style={styles.username} numberOfLines={1}>
            {item.counterparty?.username ?? 'Utilisateur'}
          </Text>
          <Text style={styles.timestamp}> · {formatRelativeTime(item.last_message_at)}</Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={1}>
          {item.post?.title ?? 'Article'}
        </Text>
      </View>

      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...conversationsQuery(),
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="chatbubbles-outline" size={56} color="#ccc" />
        <Text style={styles.emptyTitle}>Connectez-vous</Text>
        <Text style={styles.emptyText}>
          Connectez-vous pour voir vos conversations.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/login')}>
          <Text style={styles.primaryButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.emptyText}>Impossible de charger les conversations.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => refetch()}>
            <Text style={styles.primaryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={56} color="#ccc" />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptyText}>
            Vos échanges avec les acheteurs et vendeurs apparaîtront ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ConversationRow item={item} />}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.white,
  },
  headerBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileContainer: {
    marginRight: theme.spacing.md,
  },
  profilePicture: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  messageContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
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
});

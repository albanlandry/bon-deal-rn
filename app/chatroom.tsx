// app/chatroom.tsx - Chatroom Screen (real messages + inline negotiation)
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { showToast } from '../components/atoms/Toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  conversationQuery,
  markConversationRead,
  messagesQuery,
  sendMessage,
} from '@/lib/api/conversations';
import { acceptOffer, rejectOffer } from '@/lib/api/negotiations';
import { formatAmount, formatClock } from '@/lib/format';
import type { BdChatMessage, BdConversation } from '@/constants/types';

// --- System message rendering (French, mirrors the admin dashboard) --------

function renderSystemMessage(
  msg: BdChatMessage,
  conv: BdConversation | undefined,
  myId: number | undefined,
): string {
  const p = msg.payload ?? {};
  const amt = (v: unknown) => formatAmount(typeof v === 'number' ? v : Number(v));
  const who = (uid: unknown) =>
    uid === myId ? 'Vous' : (conv?.counterparty?.username ?? "L'autre partie");
  switch (msg.kind) {
    case 'system_offer_made':
      return `${who(p.by_user_id)} a fait une offre de ${amt(p.amount)}`;
    case 'system_counter':
      return `${who(p.by_user_id)} a proposé ${amt(p.amount)}`;
    case 'system_accepted':
      return `Offre acceptée — ${amt(p.amount)}`;
    case 'system_rejected':
      return `${who(p.by_user_id)} a refusé l'offre`;
    case 'system_auto_rejected':
      return "Offre clôturée — l'article a été réservé pour un autre acheteur";
    case 'system_withdrawn':
      return 'Négociation annulée par un administrateur';
    default:
      return msg.kind;
  }
}

// --- Message rows ----------------------------------------------------------

function TextBubble({ msg, mine }: { msg: BdChatMessage; mine: boolean }) {
  return (
    <View style={[styles.messageContainer, mine ? styles.sentMessage : styles.receivedMessage]}>
      <View style={[styles.messageBubble, mine ? styles.sentBubble : styles.receivedBubble]}>
        <Text style={[styles.messageText, mine ? styles.sentText : styles.receivedText]}>
          {msg.body}
        </Text>
        <Text style={[styles.timestamp, mine ? styles.sentTimestamp : styles.receivedTimestamp]}>
          {formatClock(msg.created_at)}
        </Text>
      </View>
    </View>
  );
}

function SystemPill({ text }: { text: string }) {
  return (
    <View style={styles.systemRow}>
      <View style={styles.systemPill}>
        <Text style={styles.systemText}>{text}</Text>
      </View>
    </View>
  );
}

// --- Inline negotiation banner --------------------------------------------

function NegotiationBanner({
  conv,
  myId,
  onAccept,
  onReject,
  onCounter,
  busy,
}: {
  conv: BdConversation;
  myId: number | undefined;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  busy: boolean;
}) {
  const neg = conv.latest_negotiation;
  if (!neg) return null;

  const amount = formatAmount(neg.current_offer_amount);

  if (neg.status === 'pending') {
    const myTurn = neg.last_offer_by_id !== myId;
    if (!myTurn) {
      return (
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Votre offre : {amount}</Text>
          <Text style={styles.bannerHint}>En attente de la réponse de l'autre partie…</Text>
        </View>
      );
    }
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Offre en cours : {amount}</Text>
        <View style={styles.bannerActions}>
          <TouchableOpacity
            style={[styles.bannerBtn, styles.bannerAccept]}
            onPress={onAccept}
            disabled={busy}>
            <Text style={styles.bannerAcceptText}>Accepter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bannerBtn, styles.bannerCounter]}
            onPress={onCounter}
            disabled={busy}>
            <Text style={styles.bannerCounterText}>Contre-offre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bannerBtn, styles.bannerReject]}
            onPress={onReject}
            disabled={busy}>
            <Text style={styles.bannerRejectText}>Refuser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (neg.status === 'accepted') {
    return (
      <View style={[styles.banner, styles.bannerAccepted]}>
        <Text style={styles.bannerLabel}>
          Offre acceptée — {formatAmount(neg.accepted_amount)}
        </Text>
      </View>
    );
  }

  // rejected / cancelled
  return (
    <View style={[styles.banner, styles.bannerClosed]}>
      <Text style={styles.bannerClosedText}>
        {neg.status === 'cancelled'
          ? 'Négociation annulée'
          : 'Négociation terminée — offre refusée'}
      </Text>
    </View>
  );
}

// --- Screen ----------------------------------------------------------------

export default function ChatroomScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const cid = Number(conversationId);
  const enabled = isAuthenticated && Number.isFinite(cid) && cid > 0;

  const [messageText, setMessageText] = useState('');
  const listRef = useRef<FlatList<BdChatMessage>>(null);

  const convQuery = useQuery({ ...conversationQuery(cid), enabled });
  const msgsQuery = useQuery({
    ...messagesQuery(cid),
    enabled,
    refetchInterval: 5000,
  });

  const conv = convQuery.data;
  const messages = msgsQuery.data;

  const invalidateThread = () => {
    queryClient.invalidateQueries({ queryKey: ['conversation', cid] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  // Mark read whenever the visible message count changes.
  useEffect(() => {
    if (!enabled || !messages || messages.length === 0) return;
    markConversationRead(cid)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {});
  }, [cid, enabled, messages?.length]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMessage(cid, body),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['conversation', cid, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => showToast.error('Échec', e?.message || "Message non envoyé"),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptOffer(conv!.latest_negotiation!.id),
    onSuccess: () => {
      showToast.success('Offre acceptée');
      invalidateThread();
      queryClient.invalidateQueries({ queryKey: ['conversation', cid, 'messages'] });
    },
    onError: (e: any) => showToast.error('Échec', e?.message || 'Veuillez réessayer.'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectOffer(conv!.latest_negotiation!.id),
    onSuccess: () => {
      showToast.info('Offre refusée');
      invalidateThread();
      queryClient.invalidateQueries({ queryKey: ['conversation', cid, 'messages'] });
    },
    onError: (e: any) => showToast.error('Échec', e?.message || 'Veuillez réessayer.'),
  });

  const negBusy = acceptMutation.isPending || rejectMutation.isPending;

  const handleAccept = () => {
    Alert.alert(
      'Accepter cette offre ?',
      "L'article sera réservé et une transaction sera créée.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Accepter', onPress: () => acceptMutation.mutate() },
      ],
    );
  };

  const handleReject = () => {
    Alert.alert('Refuser cette offre ?', 'La négociation sera clôturée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: () => rejectMutation.mutate() },
    ]);
  };

  const handleCounter = () => {
    if (!conv?.latest_negotiation) return;
    router.push({
      pathname: '/make-offer',
      params: {
        negotiationId: String(conv.latest_negotiation.id),
        conversationId: String(cid),
      },
    });
  };

  const handleSend = () => {
    const text = messageText.trim();
    if (text && !sendMutation.isPending) sendMutation.mutate(text);
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!enabled) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#ccc" />
        <Text style={styles.stateText}>Connectez-vous pour voir cette conversation.</Text>
        <TouchableOpacity style={styles.stateButton} onPress={() => router.back()}>
          <Text style={styles.stateButtonText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <View style={styles.profilePicture}>
            <Ionicons name="person-outline" size={20} color="#000" />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {conv?.counterparty?.username ?? 'Conversation'}
            </Text>
            {!!conv?.post?.title && (
              <Text style={styles.userStatus} numberOfLines={1}>
                {conv.post.title}
              </Text>
            )}
          </View>
        </View>
      </View>

      {conv && (
        <NegotiationBanner
          conv={conv}
          myId={user?.id}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounter={handleCounter}
          busy={negBusy}
        />
      )}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {msgsQuery.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : msgsQuery.error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={44} color="#FF6B6B" />
            <Text style={styles.stateText}>Impossible de charger les messages.</Text>
            <TouchableOpacity
              style={styles.stateButton}
              onPress={() => msgsQuery.refetch()}>
              <Text style={styles.stateButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : !messages || messages.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#ccc" />
            <Text style={styles.stateText}>
              Aucun message. Démarrez la conversation !
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) =>
              item.kind === 'text' ? (
                <TextBubble msg={item} mine={item.sender_id === user?.id} />
              ) : (
                <SystemPill text={renderSystemMessage(item, conv, user?.id)} />
              )
            }
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Composer */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Tapez un message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!messageText.trim() || sendMutation.isPending}>
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={messageText.trim() ? theme.colors.primary : '#ccc'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  stateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: theme.spacing.md,
    lineHeight: 20,
  },
  stateButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
    marginTop: theme.spacing.lg,
  },
  stateButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: theme.colors.white,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  banner: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#dce9f5',
  },
  bannerAccepted: {
    backgroundColor: '#E9F8EE',
    borderBottomColor: '#cdeed7',
  },
  bannerClosed: {
    backgroundColor: '#F5F5F5',
    borderBottomColor: '#e8e8e8',
  },
  bannerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  bannerHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bannerClosedText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  bannerBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  bannerAccept: {
    backgroundColor: theme.colors.success,
  },
  bannerAcceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerCounter: {
    backgroundColor: theme.colors.primary,
  },
  bannerCounterText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerReject: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  bannerRejectText: {
    color: '#FF6B6B',
    fontWeight: '700',
    fontSize: 13,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: theme.spacing.md,
  },
  messageContainer: {
    marginHorizontal: theme.spacing.md,
    marginVertical: 2,
  },
  sentMessage: {
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 18,
  },
  sentBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  receivedTimestamp: {
    color: '#666',
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  systemPill: {
    backgroundColor: '#ECECEC',
    borderRadius: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  systemText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
});

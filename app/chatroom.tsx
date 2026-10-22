// app/chatroom.tsx — chatroom: live delivery over the WebSocket (polling only
// while it is down), optimistic send, inline negotiation + Négo-Coach,
// quick replies and a first-chat safety banner.
// docs/09 §4 Chatroom: listing mini-card header, bubbles that rise in (new
// messages only) with sending → sent → read ticks, offers as structured cards
// with inline actions (accepting celebrates), sticky day separators.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppImage,
  AppText,
  Avatar,
  Badge,
  BUYER_QUICK_REPLIES,
  Button,
  Card,
  Celebrate,
  EmptyState,
  PressableScale,
  ErrorState,
  IconButton,
  ListRow,
  QuickReplies,
  SafetyBanner,
  SELLER_QUICK_REPLIES,
  Sheet,
  showToast,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useFallbackInterval, useRealtime } from '@/contexts/RealtimeContext';
import {
  conversationQuery,
  markConversationRead,
  messagesQuery,
  sendMessage,
} from '@/lib/api/conversations';
import { acceptOffer, coachAdvice, counterOffer, rejectOffer } from '@/lib/api/negotiations';
import { publicProfileQuery } from '@/lib/api/account';
import { blockedMessage } from '@/lib/api/safety';
import { useBlockActions } from '@/lib/useBlock';
import ReportSheet from '@/components/organisms/ReportSheet';
import DealTimeline from '@/components/molecules/DealTimeline';
import { transactionQuery } from '@/lib/api/transactions';
import { ApiError } from '@/lib/api';
import { clearUnread, mergeServerMessage, messagesKey, nextTempId } from '@/lib/chatCache';
import { formatAmount, formatClock, formatDayLabel } from '@/lib/format';
import { renderSystemMessage } from '@/lib/messagePreview';
import { haptics } from '@/lib/haptics';
import type { BdChatMessage, BdCoachVerdict, BdConversation } from '@/constants/types';
import { createStyles, Theme, useStyles, useTheme } from '@/theme';
import { enterFade, enterFromBottom, exitFade, layoutEase } from '@/components/motion/anim';

const SAFETY_DISMISSED_KEY = 'bondeal.chat.safety.dismissed.v1';

// --- System message rendering (French, mirrors the admin dashboard) --------

function systemIcon(kind: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (kind === 'system_accepted') return 'checkmark-circle';
  if (kind === 'system_meeting_set') return 'calendar-outline';
  if (kind === 'system_rejected' || kind === 'system_auto_rejected' || kind === 'system_withdrawn')
    return 'close-circle';
  return 'pricetag';
}

// --- Message rows ----------------------------------------------------------

function TextBubble({
  msg,
  mine,
  onRetry,
  onLongPress,
  animate,
}: {
  msg: BdChatMessage;
  mine: boolean;
  onRetry: (m: BdChatMessage) => void;
  /** Incoming messages: long-press opens the report sheet. */
  onLongPress?: (m: BdChatMessage) => void;
  /** Rise in (150 ms) — new messages only, never the history. */
  animate?: boolean;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const failed = msg.client_status === 'failed';
  const sending = msg.client_status === 'sending';
  const read = mine && !sending && !failed && !!msg.read_at;
  const tick = sending ? 'time-outline' : read ? 'checkmark-done' : 'checkmark';
  return (
    <Animated.View
      entering={animate ? enterFromBottom() : undefined}
      style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
      <Pressable
        disabled={!failed && !onLongPress}
        onPress={failed ? () => onRetry(msg) : undefined}
        onLongPress={onLongPress ? () => onLongPress(msg) : undefined}
        delayLongPress={400}
        accessibilityRole={failed ? 'button' : undefined}
        accessibilityLabel={failed ? `Message non envoyé : ${msg.body}. Toucher pour réessayer` : undefined}
        accessibilityHint={onLongPress ? 'Appui long pour signaler ce message' : undefined}
        accessibilityActions={onLongPress ? [{ name: 'longpress', label: 'Signaler ce message' }] : undefined}
        onAccessibilityAction={onLongPress ? () => onLongPress(msg) : undefined}
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: t.colors.brandTint, borderBottomRightRadius: t.radius.xs }
            : { backgroundColor: t.colors.surface, borderColor: t.colors.line, borderWidth: 1, borderBottomLeftRadius: t.radius.xs },
          failed && { borderColor: t.colors.danger, borderWidth: 1 },
        ]}>
        <AppText variant="body">{msg.body}</AppText>
        <View style={styles.metaRow}>
          <AppText variant="caption" color="inkSubtle">
            {sending ? 'Envoi…' : failed ? 'Échec · Réessayer' : formatClock(msg.created_at)}
          </AppText>
          {mine && !failed && (
            // Key swap = the tick cross-fades when its state changes.
            <Animated.View
              key={tick}
              entering={enterFade()}
              accessibilityLabel={sending ? 'Envoi en cours' : read ? 'Lu' : 'Envoyé'}>
              <Ionicons name={tick} size={14} color={read ? t.colors.trust : t.colors.inkSubtle} />
            </Animated.View>
          )}
          {failed && <Ionicons name="refresh" size={12} color={t.colors.danger} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SystemPill({ text, kind, animate }: { text: string; kind: string; animate?: boolean }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const accepted = kind === 'system_accepted';
  const meeting = kind === 'system_meeting_set';
  return (
    <Animated.View entering={animate ? enterFromBottom() : undefined} style={styles.systemRow} accessibilityRole="text">
      <View
        style={[
          styles.systemPill,
          { backgroundColor: accepted ? t.colors.successTint : meeting ? t.colors.brandTint : t.colors.surfaceAlt },
        ]}>
        <Ionicons
          name={systemIcon(kind)}
          size={14}
          color={accepted ? t.colors.success : meeting ? t.colors.brandStrong : t.colors.inkMuted}
        />
        <AppText variant="captionStrong" color={accepted ? 'success' : meeting ? 'brandStrong' : 'inkMuted'}>
          {text}
        </AppText>
      </View>
    </Animated.View>
  );
}

/** Sticky (stickyHeaderIndices) day pill. */
function DaySeparator({ label }: { label: string }) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.dayRow} accessibilityRole="header">
      <View style={[styles.dayPill, { backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
        <AppText variant="captionStrong" color="inkMuted">
          {label}
        </AppText>
      </View>
    </View>
  );
}

// --- Offers as structured cards ---------------------------------------------

type OfferStatus = { label: string; tone: 'warning' | 'success' | 'neutral' | 'brand' | 'danger'; icon: any };

function offerStatus(isLatest: boolean, conv: BdConversation | undefined, mine: boolean): OfferStatus {
  const ln = conv?.latest_negotiation;
  if (!isLatest || !ln) return { label: 'Remplacée', tone: 'neutral', icon: 'swap-horizontal' };
  switch (ln.status) {
    case 'pending':
      return mine
        ? { label: 'En attente', tone: 'warning', icon: 'hourglass-outline' }
        : { label: 'À vous de répondre', tone: 'brand', icon: 'alert-circle-outline' };
    case 'accepted':
      return { label: 'Acceptée', tone: 'success', icon: 'checkmark-circle' };
    case 'rejected':
      return { label: 'Refusée', tone: 'danger', icon: 'close-circle-outline' };
    default:
      return { label: 'Annulée', tone: 'neutral', icon: 'close-circle-outline' };
  }
}

function OfferCard({
  msg,
  conv,
  myId,
  isLatest,
  animate,
  busy,
  coachLoading,
  coachVisible,
  onAccept,
  onReject,
  onCounter,
  onCoach,
}: {
  msg: BdChatMessage;
  conv: BdConversation | undefined;
  myId: number | undefined;
  isLatest: boolean;
  animate?: boolean;
  busy: boolean;
  coachLoading: boolean;
  coachVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  onCoach: () => void;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const p = msg.payload ?? {};
  const amount = typeof p.amount === 'number' ? p.amount : Number(p.amount);
  const mine = p.by_user_id === myId || (p.by_user_id == null && msg.sender_id === myId);
  const status = offerStatus(isLatest, conv, mine);
  const ln = conv?.latest_negotiation;
  const actionable = isLatest && ln?.status === 'pending' && ln.last_offer_by_id !== myId;
  const kindLabel = msg.kind === 'system_counter' ? 'Contre-offre' : 'Offre';
  const who = mine ? 'Vous' : (conv?.counterparty?.username ?? "L’autre partie");
  const asking = conv?.post?.price;
  const superseded = status.label === 'Remplacée';

  return (
    <Animated.View
      entering={animate ? enterFromBottom() : undefined}
      layout={layoutEase()}
      style={[styles.offerWrap, mine ? styles.right : styles.left]}>
      <View
        accessibilityRole="summary"
        accessibilityLabel={`${kindLabel} de ${who} : ${formatAmount(amount)}, ${status.label}`}
        style={[
          styles.offerCard,
          {
            backgroundColor: t.colors.surface,
            borderColor: actionable ? t.colors.brandStrong : t.colors.line,
            borderWidth: actionable ? 1.5 : 1,
            opacity: superseded ? 0.75 : 1,
          },
        ]}>
        <View style={styles.inlineBetween}>
          <View style={styles.inline}>
            <Ionicons name="pricetag" size={14} color={t.colors.brandStrong} />
            <AppText variant="captionStrong" color="inkMuted">
              {kindLabel} · {who}
            </AppText>
          </View>
          <Badge label={status.label} tone={status.tone} icon={status.icon} />
        </View>
        <AppText
          variant="priceLarge"
          style={superseded ? { textDecorationLine: 'line-through', color: t.colors.inkMuted } : undefined}>
          {formatAmount(amount)}
        </AppText>
        {!!asking && asking > 0 && Number.isFinite(amount) && amount !== asking && (
          <AppText variant="caption" color="inkMuted">
            Prix affiché {formatAmount(asking)} · {amount < asking ? '−' : '+'}
            {Math.round((Math.abs(asking - amount) / asking) * 100)} %
          </AppText>
        )}
        <AppText variant="caption" color="inkSubtle">
          {formatClock(msg.created_at)}
        </AppText>
        {actionable && (
          <Animated.View entering={enterFade()} exiting={exitFade()} style={styles.offerActions}>
            <View style={styles.bannerActions}>
              <Button label="Accepter" icon="checkmark" onPress={onAccept} disabled={busy} style={styles.flex} />
              <Button variant="secondary" label="Contre-offre" onPress={onCounter} disabled={busy} style={styles.flex} />
            </View>
            <View style={styles.inlineBetween}>
              <Button variant="ghost" label="Refuser" onPress={onReject} disabled={busy} />
              {!coachVisible && (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Demander l’avis du Négo-Coach"
                  onPress={onCoach}
                  disabled={coachLoading || busy}
                  style={[styles.coachPill, { backgroundColor: t.colors.brandTint }]}>
                  {coachLoading ? (
                    <>
                      <ActivityIndicator size="small" color={t.colors.brandStrong} />
                      <AppText variant="captionStrong" color="brandStrong">
                        Le coach regarde le marché…
                      </AppText>
                    </>
                  ) : (
                    <>
                      <Ionicons name="bulb-outline" size={14} color={t.colors.brandStrong} />
                      <AppText variant="captionStrong" color="brandStrong">
                        Avis du coach
                      </AppText>
                    </>
                  )}
                </PressableScale>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

// --- Négo-Coach (ephemeral verdict card) ------------------------------------

function coachErrorMessage(e: unknown): string {
  const status = e instanceof ApiError ? e.status : 0;
  if (status === 503) return "Le coach n’est pas disponible pour le moment.";
  if (status === 429) return 'Trop de demandes au coach — réessayez plus tard.';
  if (status === 409) return "L’offre a changé, actualisation…";
  return 'Impossible de contacter le coach. Réessayez.';
}

function confidenceLabel(c: number): string {
  if (c >= 0.7) return 'Conseil fiable';
  if (c >= 0.4) return 'Conseil indicatif';
  return 'À prendre avec prudence';
}

function CoachCard({
  coach,
  ctaEnabled,
  sending,
  onSendCounter,
  onAccept,
  onDismiss,
}: {
  coach: BdCoachVerdict;
  ctaEnabled: boolean;
  sending: boolean;
  onSendCounter: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const title =
    coach.action === 'counter'
      ? `Proposez ${formatAmount(coach.suggested_amount)}`
      : coach.action === 'accept'
        ? 'Bonne affaire — vous pouvez accepter'
        : "Patientez — ne changez rien pour l’instant";

  const m = coach.market;
  const span = m ? m.range_max - m.range_min : 0;
  const dotPos = m
    ? Math.min(Math.max(span > 0 ? ((coach.suggested_amount ?? m.suggested) - m.range_min) / span : 0.5, 0), 1)
    : 0.5;

  const cp = coach.counterparty;
  const cpLabel = coach.role === 'buyer' ? 'Vendeur' : 'Acheteur';
  const trust =
    cp && cp.review_count && cp.avg_rating != null
      ? `${cpLabel} : ★ ${cp.avg_rating.toFixed(1).replace('.', ',')} · ${cp.review_count} avis`
      : `${cpLabel} : nouveau membre, pas encore d’avis`;

  return (
    <Card tone="brand" style={styles.coachCard}>
      <View style={styles.coachTitleRow}>
        <View style={styles.inline}>
          <Ionicons name="bulb" size={16} color={t.colors.brandStrong} />
          <AppText variant="labelStrong" color="brandStrong">
            Négo-Coach
          </AppText>
        </View>
        <AppText variant="caption" color="inkMuted">
          Visible par vous seul
        </AppText>
      </View>
      <AppText variant="bodyStrong">{title}</AppText>
      <AppText variant="small" color="inkMuted">
        {coach.rationale_fr}
      </AppText>
      {m ? (
        <>
          <AppText variant="caption" color="inkMuted">
            Marché : {formatAmount(m.range_min)} – {formatAmount(m.range_max)} · {m.comparable_count}{' '}
            annonce{m.comparable_count > 1 ? 's' : ''} similaire{m.comparable_count > 1 ? 's' : ''}
          </AppText>
          <View style={[styles.coachBarTrack, { backgroundColor: t.colors.line }]}>
            <View style={[styles.coachBarDot, { left: `${dotPos * 100}%`, backgroundColor: t.colors.brandStrong }]} />
          </View>
        </>
      ) : (
        <AppText variant="caption" color="inkMuted">
          Peu d’annonces similaires — conseil basé sur vos échanges
        </AppText>
      )}
      <AppText variant="caption" color="inkMuted">
        {trust} · {confidenceLabel(coach.confidence)}
      </AppText>
      {!!coach.warning && (
        <AppText variant="caption" color="warning">
          {coach.warning}
        </AppText>
      )}
      <View style={styles.coachActions}>
        {coach.action === 'counter' && (
          <Button
            label={`Envoyer ${formatAmount(coach.suggested_amount)}`}
            onPress={onSendCounter}
            loading={sending}
            disabled={!ctaEnabled}
          />
        )}
        {coach.action === 'accept' && (
          <Button label="Accepter l’offre" onPress={onAccept} disabled={!ctaEnabled} />
        )}
        <Button
          variant="ghost"
          label={coach.action === 'hold' ? 'Compris' : 'Ignorer'}
          onPress={onDismiss}
        />
      </View>
      <AppText variant="caption" color="inkSubtle">
        Le coach utilise les mêmes données pour l’acheteur et le vendeur.
      </AppText>
    </Card>
  );
}

// --- Inline negotiation banner --------------------------------------------

function NegotiationBanner({
  conv,
  myId,
  onAccept,
  onReject,
  onCounter,
  onCoach,
  coachLoading,
  coachVisible,
  busy,
  hasOfferCard,
}: {
  /** The pending offer is shown (with its actions) as a card in the thread. */
  hasOfferCard: boolean;
  conv: BdConversation;
  myId: number | undefined;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  onCoach: () => void;
  coachLoading: boolean;
  coachVisible: boolean;
  busy: boolean;
}) {
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const neg = conv.latest_negotiation;
  if (!neg) return null;
  if (hasOfferCard && neg.status !== 'pending' && neg.status !== 'accepted') return null;
  const amount = formatAmount(neg.current_offer_amount);

  if (neg.status === 'pending' && hasOfferCard) return null;
  if (neg.status === 'pending') {
    const myTurn = neg.last_offer_by_id !== myId;
    if (!myTurn) {
      return (
        <View style={[styles.banner, { backgroundColor: t.colors.surfaceAlt }]}>
          <Ionicons name="hourglass-outline" size={18} color={t.colors.inkMuted} />
          <View style={styles.flex}>
            <AppText variant="labelStrong">Votre offre : {amount}</AppText>
            <AppText variant="caption" color="inkMuted">
              En attente de la réponse de {conv.counterparty?.username ?? "l’autre partie"}…
            </AppText>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.bannerCol, { backgroundColor: t.colors.brandTint }]}>
        <View style={styles.inlineBetween}>
          <AppText variant="labelStrong">Offre reçue : {amount}</AppText>
          {!coachVisible && (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Demander l’avis du Négo-Coach"
              onPress={onCoach}
              disabled={coachLoading || busy}
              style={styles.coachPill}>
              {coachLoading ? (
                <>
                  <ActivityIndicator size="small" color={t.colors.brandStrong} />
                  <AppText variant="captionStrong" color="brandStrong">
                    Le coach regarde le marché…
                  </AppText>
                </>
              ) : (
                <>
                  <Ionicons name="bulb-outline" size={14} color={t.colors.brandStrong} />
                  <AppText variant="captionStrong" color="brandStrong">
                    Avis du coach
                  </AppText>
                </>
              )}
            </PressableScale>
          )}
        </View>
        <View style={styles.bannerActions}>
          <Button label="Accepter" onPress={onAccept} disabled={busy} style={styles.flex} />
          <Button variant="secondary" label="Contre-offre" onPress={onCounter} disabled={busy} style={styles.flex} />
        </View>
        <Button variant="ghost" label="Refuser" onPress={onReject} disabled={busy} />
      </View>
    );
  }

  if (neg.status === 'accepted') {
    if (hasOfferCard) return null;
    return (
      <View style={[styles.banner, { backgroundColor: t.colors.successTint }]}>
        <Ionicons name="checkmark-circle" size={18} color={t.colors.success} />
        <AppText variant="labelStrong" style={styles.flex}>
          Offre acceptée — {formatAmount(neg.accepted_amount)}. Convenez d’un lieu public pour l’échange.
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: t.colors.surfaceAlt }]}>
      <Ionicons name="close-circle-outline" size={18} color={t.colors.inkMuted} />
      <AppText variant="label" color="inkMuted">
        {neg.status === 'cancelled' ? 'Négociation annulée' : 'Négociation terminée — offre refusée'}
      </AppText>
    </View>
  );
}

// --- Screen ----------------------------------------------------------------

type Row =
  | { type: 'day'; key: string; label: string }
  | { type: 'msg'; key: string; msg: BdChatMessage };

export default function ChatroomScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const queryClient = useQueryClient();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { setActiveConversation } = useRealtime();
  const cid = Number(conversationId);
  const enabled = isAuthenticated && Number.isFinite(cid) && cid > 0;

  const [messageText, setMessageText] = useState('');
  const [coach, setCoach] = useState<BdCoachVerdict | null>(null);
  const [safetyDismissed, setSafetyDismissed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<{ type: 'user' | 'message'; id: number; subject?: string } | null>(null);
  const [actionMsg, setActionMsg] = useState<BdChatMessage | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  // Ids present at first paint: those never animate (only new messages rise in).
  const seenIds = useRef<Set<number> | null>(null);
  const safetyShownFull = useRef(false);
  const { confirmBlock, confirmUnblock } = useBlockActions();
  const listRef = useRef<FlatList<Row>>(null);
  // Follow new messages only when already at the newest one (within 80 px) or
  // after sending; reading history never jumps down.
  const nearEnd = useRef(true);
  const justSent = useRef(false);
  const onThreadScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    nearEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
  };
  const followThread = () => {
    if (!nearEnd.current && !justSent.current) return;
    justSent.current = false;
    listRef.current?.scrollToEnd({ animated: !t.reduceMotion });
  };

  // Live delivery comes from the realtime provider; poll only while it's down.
  const pollMs = useFallbackInterval(5000);
  const convQuery = useQuery({ ...conversationQuery(cid), enabled });
  const msgsQuery = useQuery({ ...messagesQuery(cid), enabled, refetchInterval: pollMs });

  const conv = convQuery.data;
  const messages = msgsQuery.data;
  const myId = user?.id;
  const otherId = conv?.counterparty?.id;
  const otherProfile = useQuery({ ...publicProfileQuery(otherId), enabled: enabled && !!otherId, staleTime: 0 });
  const blockedByMe = !!otherProfile.data?.blocked_by_me;

  // Messages for the open room don't count as unread.
  useEffect(() => {
    if (!enabled) return;
    setActiveConversation(cid);
    return () => setActiveConversation(null);
  }, [cid, enabled, setActiveConversation]);

  useEffect(() => {
    AsyncStorage.getItem(SAFETY_DISMISSED_KEY)
      .then((v) => setSafetyDismissed(v === '1'))
      .catch(() => setSafetyDismissed(false));
  }, []);

  const invalidateThread = () => {
    queryClient.invalidateQueries({ queryKey: ['conversation', cid] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  // Mark read whenever a new message from the other party is visible.
  const lastIncomingId = [...(messages ?? [])].reverse().find((m) => m.id > 0 && m.sender_id !== myId)?.id;
  useEffect(() => {
    if (!enabled || !lastIncomingId) return;
    clearUnread(queryClient, cid);
    markConversationRead(cid).catch(() => {});
  }, [cid, enabled, lastIncomingId]);

  // --- Optimistic send ---------------------------------------------------
  const setThread = (fn: (old: BdChatMessage[] | undefined) => BdChatMessage[] | undefined) =>
    queryClient.setQueryData<BdChatMessage[]>(messagesKey(cid), fn);

  const sendMutation = useMutation({
    mutationFn: ({ body }: { body: string; tempId: number }) => sendMessage(cid, body),
    onMutate: async ({ body, tempId }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey(cid) });
      const temp: BdChatMessage = {
        id: tempId,
        conversation_id: cid,
        sender_id: myId ?? null,
        kind: 'text',
        body,
        payload: null,
        created_at: new Date().toISOString(),
        read_at: null,
        client_status: 'sending',
      };
      setThread((old) => [...(old ?? []), temp]);
    },
    onSuccess: (real, { tempId }) => {
      // The socket echo may already have replaced the temp; dedupe either way.
      setThread((old) => mergeServerMessage(old?.filter((m) => m.id !== tempId), real, myId));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any, { tempId }) => {
      setThread((old) => old?.map((m) => (m.id === tempId ? { ...m, client_status: 'failed' } : m)));
      const blocked = blockedMessage(e);
      showToast.error('Message non envoyé', blocked ?? (e?.message || 'Touchez le message pour réessayer.'));
    },
  });

  const send = (text: string) => {
    const body = text.trim();
    if (!body) return;
    haptics.light();
    justSent.current = true;
    sendMutation.mutate({ body, tempId: nextTempId() });
  };

  const handleSend = () => {
    const text = messageText;
    if (!text.trim()) return;
    setMessageText('');
    send(text);
  };

  const handleRetry = (m: BdChatMessage) => {
    setThread((old) => old?.filter((x) => x.id !== m.id));
    if (m.body) send(m.body);
  };

  // --- Negotiation ---------------------------------------------------------
  const acceptMutation = useMutation({
    mutationFn: () => acceptOffer(conv!.latest_negotiation!.id),
    onSuccess: () => {
      haptics.success();
      setCelebrate(Date.now()); // peak–end: short confetti, never blocks touches
      showToast.success('Offre acceptée');
      invalidateThread();
    },
    onError: (e: any) => showToast.error('Échec', blockedMessage(e) ?? (e?.message || 'Veuillez réessayer.')),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectOffer(conv!.latest_negotiation!.id),
    onSuccess: () => {
      showToast.info('Offre refusée');
      invalidateThread();
    },
    onError: (e: any) => showToast.error('Échec', blockedMessage(e) ?? (e?.message || 'Veuillez réessayer.')),
  });

  const negBusy = acceptMutation.isPending || rejectMutation.isPending;
  const ln = conv?.latest_negotiation;
  // Accepted offer → the header card becomes the deal's (amount + timeline → deal page).
  const dealId = ln?.status === 'accepted' && ln.transaction_id ? ln.transaction_id : null;
  const dealQuery = useQuery(transactionQuery(dealId));
  const deal = dealQuery.data;
  // A meeting set by the other party (live message) refreshes the deal.
  const lastMeetingMsgId = useMemo(() => {
    const m = [...(msgsQuery.data ?? [])].reverse().find((x) => x.kind === 'system_meeting_set');
    return m ? m.id : null;
  }, [msgsQuery.data]);
  useEffect(() => {
    if (lastMeetingMsgId != null && dealId) {
      queryClient.invalidateQueries({ queryKey: ['transaction', dealId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  }, [lastMeetingMsgId, dealId, queryClient]);
  const dealReviewed = (deal?.reviews ?? []).some((r) => r.reviewer_id === myId);

  const ladderKey = ln
    ? `${ln.id}:${ln.status}:${ln.current_offer_amount}:${ln.last_offer_by_id}`
    : 'none';
  useEffect(() => {
    setCoach(null);
  }, [ladderKey]);

  const coachMutation = useMutation({
    mutationFn: () => coachAdvice(conv!.latest_negotiation!.id),
    onSuccess: setCoach,
    onError: (e: any) => showToast.error('Négo-Coach', coachErrorMessage(e)),
  });

  const sendCoachCounter = useMutation({
    mutationFn: () => counterOffer(coach!.negotiation_id, { amount: coach!.suggested_amount! }),
    onSuccess: () => {
      setCoach(null);
      showToast.success('Contre-offre envoyée');
      invalidateThread();
    },
    onError: () => {
      setCoach(null);
      showToast.error('Négo-Coach', "L’offre a changé, actualisation…");
      invalidateThread();
    },
  });

  const coachCtaEnabled =
    !!coach &&
    !coach.stale &&
    !!ln &&
    ln.id === coach.negotiation_id &&
    ln.status === 'pending' &&
    ln.last_offer_by_id !== myId &&
    ln.current_offer_amount === coach.as_of_amount &&
    ln.last_offer_by_id === coach.as_of_last_offer_by_id;

  const handleCoachSend = () => {
    if (!coach?.suggested_amount) return;
    Alert.alert(
      'Envoyer la contre-offre ?',
      `Proposer ${formatAmount(coach.suggested_amount)} à ${conv?.counterparty?.username} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Envoyer', onPress: () => sendCoachCounter.mutate() },
      ],
    );
  };

  const handleAccept = () => {
    Alert.alert('Accepter cette offre ?', "L’article sera réservé et une transaction sera créée.", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Accepter', onPress: () => acceptMutation.mutate() },
    ]);
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
      params: { negotiationId: String(conv.latest_negotiation.id), conversationId: String(cid) },
    });
  };

  const openProfile = () => {
    if (!otherId) return;
    router.push({
      pathname: '/seller-profile',
      params: { userId: String(otherId), username: conv?.counterparty?.username ?? '' },
    });
  };

  const dismissSafety = () => {
    setSafetyDismissed(true);
    AsyncStorage.setItem(SAFETY_DISMISSED_KEY, '1').catch(() => {});
  };

  // "Collapses after first read": once the full banner has been on screen in
  // a room, later rooms show the compact version.
  useEffect(() => {
    if (!safetyDismissed) safetyShownFull.current = true;
  }, [safetyDismissed]);
  useEffect(
    () => () => {
      if (safetyShownFull.current) AsyncStorage.setItem(SAFETY_DISMISSED_KEY, '1').catch(() => {});
    },
    [],
  );

  if (messages && !seenIds.current) seenIds.current = new Set(messages.map((m) => m.id));
  const shouldAnimate = (m: BdChatMessage) => {
    const seen = seenIds.current;
    if (!seen || seen.has(m.id)) return false;
    seen.add(m.id);
    // Own server echoes replace an already-animated temp bubble: don't replay.
    return m.sender_id !== myId || m.client_status === 'sending' || m.kind !== 'text';
  };

  // --- Render ----------------------------------------------------------------
  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={t.colors.brandStrong} />
      </SafeAreaView>
    );
  }

  if (!enabled) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="chatbubbles-outline"
          title="Connectez-vous"
          message="Connectez-vous pour voir cette conversation."
          actionLabel="Se connecter"
          onAction={() => router.replace('/login')}
          secondaryLabel="Retour"
          onSecondary={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const rows: Row[] = [];
  const stickyDays: number[] = [];
  let lastDay = '';
  let latestOfferId: number | null = null;
  (messages ?? []).forEach((m) => {
    const day = formatDayLabel(m.created_at);
    if (day !== lastDay) {
      stickyDays.push(rows.length);
      rows.push({ type: 'day', key: `day-${day}`, label: day });
      lastDay = day;
    }
    rows.push({ type: 'msg', key: String(m.id), msg: m });
    if (m.kind === 'system_offer_made' || m.kind === 'system_counter') latestOfferId = m.id;
  });

  const hasMyMessage = (messages ?? []).some((m) => m.kind === 'text' && m.sender_id === myId);
  const isBuyer = conv?.role === 'buyer';
  const showQuickReplies = !!conv && !hasMyMessage;
  const post = conv?.post;
  const postBadge =
    post?.state === 'sold' ? 'Vendu' : post?.state === 'reserved' ? 'Réservé' : null;
  // Buyer can (re)open a negotiation from the chat when none is pending.
  const canMakeOffer =
    !!conv && isBuyer && !blockedByMe && post?.state === 'published' && !post.is_free && ln?.status !== 'pending' && ln?.status !== 'accepted';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header: counterparty, then the listing mini-card (thumb + price + state). */}
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Retour" onPress={() => router.back()} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Voir le profil de ${conv?.counterparty?.username ?? ''}`}
          disabled={!otherId}
          onPress={openProfile}
          style={styles.who}>
          <Avatar uri={otherProfile.data?.avatar_url} name={conv?.counterparty?.username} size={40} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {conv?.counterparty?.username ?? 'Conversation'}
            </AppText>
            <AppText variant="caption" color="inkMuted">
              {conv ? (isBuyer ? 'Vendeur' : 'Acheteur') : ' '}
            </AppText>
          </View>
        </PressableScale>
        {conv && (
          <IconButton icon="ellipsis-vertical" label="Options de la conversation" onPress={() => setMenuOpen(true)} />
        )}
      </View>
      {post && (
        <View style={styles.listingWrap}>
          {dealId ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Suivi de l’affaire : ${post.title}, accord à ${formatAmount(deal?.amount ?? ln?.current_offer_amount)}`}
              accessibilityHint="Ouvre la page de l’affaire : rendez-vous, confirmation, avis"
              onPress={() => router.push({ pathname: '/deal', params: { id: String(dealId) } } as never)}
              style={[styles.listing, styles.dealCard, { backgroundColor: t.colors.canvas, borderColor: t.colors.line }]}>
              <View style={styles.dealTop}>
                <AppImage uri={post.thumbnail_url} style={styles.listingThumb} recyclingKey={`p${post.id}`} />
                <View style={styles.flex}>
                  <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                    {post.title}
                  </AppText>
                  <AppText variant="price">Accord {formatAmount(deal?.amount ?? ln?.current_offer_amount)}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
              </View>
              {deal && <DealTimeline status={deal.status} reviewed={dealReviewed} />}
            </PressableScale>
          ) : (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Voir l’annonce ${post.title}, ${post.is_free ? 'Gratuit' : formatAmount(post.price)}${postBadge ? `, ${postBadge}` : ''}`}
            onPress={() => router.push({ pathname: '/item-details', params: { id: String(post.id) } })}
            style={[styles.listing, { backgroundColor: t.colors.canvas, borderColor: t.colors.line }]}>
            <AppImage uri={post.thumbnail_url} style={styles.listingThumb} recyclingKey={`p${post.id}`} />
            <View style={styles.flex}>
              <AppText variant="price" color={post.is_free ? 'success' : 'ink'}>
                {post.is_free ? 'Gratuit' : formatAmount(post.price)}
              </AppText>
              <AppText variant="small" color="inkMuted" numberOfLines={1}>
                {post.title}
              </AppText>
            </View>
            {postBadge && <Badge label={postBadge} tone={postBadge === 'Vendu' ? 'overlay' : 'warning'} />}
            <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
          </PressableScale>
          )}
        </View>
      )}

      {conv && (
        <NegotiationBanner
          conv={conv}
          myId={myId}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounter={handleCounter}
          onCoach={() => coachMutation.mutate()}
          coachLoading={coachMutation.isPending}
          coachVisible={!!coach}
          busy={negBusy}
          hasOfferCard={latestOfferId != null}
        />
      )}

      {blockedByMe && (
        <View style={[styles.banner, { backgroundColor: t.colors.warningTint }]}>
          <Ionicons name="ban-outline" size={18} color={t.colors.warning} />
          <AppText variant="label" style={styles.flex}>
            Vous avez bloqué ce membre. Débloquez-le pour lui écrire.
          </AppText>
          <Button size="sm" variant="secondary" label="Débloquer" onPress={() => otherId && confirmUnblock(otherId, conv?.counterparty?.username)} />
        </View>
      )}

      {coach && (
        <CoachCard
          coach={coach}
          ctaEnabled={coachCtaEnabled}
          sending={sendCoachCounter.isPending}
          onSendCounter={handleCoachSend}
          onAccept={handleAccept}
          onDismiss={() => setCoach(null)}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {msgsQuery.isLoading ? (
          <View style={styles.skeletons}>
            <Skeleton width="60%" height={44} radius={t.radius.md} />
            <Skeleton width="45%" height={44} radius={t.radius.md} style={{ alignSelf: 'flex-end' }} />
            <Skeleton width="55%" height={44} radius={t.radius.md} />
          </View>
        ) : msgsQuery.error && !messages ? (
          <ErrorState message="Impossible de charger les messages." onRetry={() => msgsQuery.refetch()} />
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.key}
            stickyHeaderIndices={stickyDays}
            renderItem={({ item }) =>
              item.type === 'day' ? (
                <DaySeparator label={item.label} />
              ) : item.msg.kind === 'text' ? (
                <TextBubble
                  msg={item.msg}
                  mine={item.msg.sender_id === myId}
                  onRetry={handleRetry}
                  onLongPress={item.msg.sender_id !== myId && item.msg.id > 0 ? setActionMsg : undefined}
                  animate={shouldAnimate(item.msg)}
                />
              ) : item.msg.kind === 'system_offer_made' || item.msg.kind === 'system_counter' ? (
                <OfferCard
                  msg={item.msg}
                  conv={conv}
                  myId={myId}
                  isLatest={item.msg.id === latestOfferId}
                  animate={shouldAnimate(item.msg)}
                  busy={negBusy}
                  coachLoading={coachMutation.isPending}
                  coachVisible={!!coach}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCounter={handleCounter}
                  onCoach={() => coachMutation.mutate()}
                />
              ) : (
                <SystemPill
                  text={renderSystemMessage(item.msg, conv, myId)}
                  kind={item.msg.kind}
                  animate={shouldAnimate(item.msg)}
                />
              )
            }
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={onThreadScroll}
            scrollEventThrottle={64}
            onContentSizeChange={followThread}
            ListHeaderComponent={
              <Animated.View layout={layoutEase()} style={styles.safety}>
                {!safetyDismissed ? <SafetyBanner onDismiss={dismissSafety} /> : <SafetyBanner compact />}
              </Animated.View>
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <AppText variant="small" color="inkMuted" align="center">
                  {isBuyer
                    ? 'Présentez-vous et posez vos questions au vendeur.'
                    : 'Aucun message pour le moment.'}
                </AppText>
              </View>
            }
          />
        )}

        {showQuickReplies && (
          <Animated.View entering={enterFade()} exiting={exitFade()}>
            <QuickReplies
              replies={isBuyer ? BUYER_QUICK_REPLIES : SELLER_QUICK_REPLIES}
              onPick={(r) => send(r)}
            />
          </Animated.View>
        )}

        {canMakeOffer && (
          <View style={styles.offerRow}>
            <Button
              label="Faire une offre"
              icon="pricetag-outline"
              size="sm"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/make-offer', params: { postId: String(post!.id), conversationId: String(cid) } })
              }
            />
          </View>
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={[t.type.body, styles.input]}
            placeholder={blockedByMe ? 'Membre bloqué' : 'Écrire un message…'}
            editable={!blockedByMe}
            placeholderTextColor={t.colors.inkSubtle}
            selectionColor={t.colors.brandStrong}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={4000}
            accessibilityLabel="Message"
            maxFontSizeMultiplier={1.3}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Envoyer"
            accessibilityState={{ disabled: !messageText.trim() }}
            onPress={handleSend}
            disabled={!messageText.trim()}
            scaleTo={0.9}
            style={[
              styles.send,
              { backgroundColor: messageText.trim() ? t.colors.brand : t.colors.surfaceAlt },
            ]}>
            <Ionicons
              name="send"
              size={20}
              color={messageText.trim() ? t.colors.onBrand : t.colors.inkSubtle}
            />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={conv?.counterparty?.username ?? 'Conversation'}>
        <ListRow
          icon="person-circle-outline"
          title="Voir le profil"
          onPress={() => {
            setMenuOpen(false);
            openProfile();
          }}
        />
        <ListRow
          icon="flag-outline"
          title="Signaler ce membre"
          subtitle="Arnaque, harcèlement, faux profil…"
          onPress={() => {
            setMenuOpen(false);
            if (otherId) setReport({ type: 'user', id: otherId, subject: conv?.counterparty?.username });
          }}
        />
        {blockedByMe ? (
          <ListRow
            icon="lock-open-outline"
            title="Débloquer"
            onPress={() => {
              setMenuOpen(false);
              if (otherId) confirmUnblock(otherId, conv?.counterparty?.username);
            }}
            last
          />
        ) : (
          <ListRow
            icon="ban-outline"
            title="Bloquer ce membre"
            subtitle="Plus de messages ni d’offres entre vous"
            destructive
            onPress={() => {
              setMenuOpen(false);
              if (otherId) confirmBlock(otherId, conv?.counterparty?.username);
            }}
            last
          />
        )}
      </Sheet>

      <Sheet visible={!!actionMsg} onClose={() => setActionMsg(null)} title="Message">
        {!!actionMsg?.body && (
          <AppText variant="small" color="inkMuted" numberOfLines={3} style={styles.quoted}>
            « {actionMsg.body} »
          </AppText>
        )}
        <ListRow
          icon="flag-outline"
          title="Signaler ce message"
          destructive
          onPress={() => {
            const m = actionMsg;
            setActionMsg(null);
            if (m) setReport({ type: 'message', id: m.id, subject: m.body ?? undefined });
          }}
          last
        />
      </Sheet>

      <Celebrate trigger={celebrate} haptic={false} onDone={() => setCelebrate(0)} />

      <ReportSheet
        visible={!!report}
        onClose={() => setReport(null)}
        targetType={report?.type ?? 'user'}
        targetId={report?.id ?? null}
        subject={report?.subject}
      />
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 4,
    paddingLeft: 4,
    minHeight: 60,
    backgroundColor: t.colors.surface,
  },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  listingWrap: {
    paddingHorizontal: t.spacing.sm,
    paddingBottom: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
  },
  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.xs,
    paddingRight: t.spacing.sm,
    borderRadius: t.radius.md,
    borderWidth: 1,
    minHeight: 64,
  },
  listingThumb: { width: 48, height: 48, borderRadius: t.radius.sm },
  dayRow: { alignItems: 'center', paddingVertical: 8 },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  offerWrap: { marginVertical: 8, width: '82%', maxWidth: 360 },
  offerCard: { borderRadius: t.radius.md, padding: t.spacing.sm, gap: 4 },
  offerActions: { gap: 4, marginTop: t.spacing.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  bannerCol: { paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm, gap: t.spacing.xs },
  bannerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  coachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surface,
  },
  coachCard: { margin: t.spacing.sm, gap: 8 },
  coachTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coachBarTrack: { height: 4, borderRadius: 2, marginVertical: 8 },
  coachBarDot: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, marginLeft: -6 },
  coachActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  skeletons: { padding: t.spacing.md, gap: t.spacing.sm },
  dealCard: { flexDirection: 'column', alignItems: 'stretch', gap: t.spacing.xs },
  dealTop: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  offerRow: { flexDirection: 'row', paddingHorizontal: t.spacing.sm, paddingBottom: t.spacing.xs },
  quoted: { marginBottom: t.spacing.sm },
  messagesContent: { paddingHorizontal: t.spacing.sm, paddingBottom: t.spacing.xs, flexGrow: 1 },
  safety: { paddingVertical: t.spacing.xs },
  emptyChat: { padding: t.spacing.xl },
  bubbleRow: { marginVertical: 4, maxWidth: '82%' },
  right: { alignSelf: 'flex-end' },
  left: { alignSelf: 'flex-start' },
  bubble: { borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.sm,
    maxWidth: '90%',
  },
  // Floating composer bar (docs/12): inset, radius.lg, above the keyboard.
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: t.spacing.sm,
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xs,
    padding: 6,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
    ...(t.elevation.sheet as object),
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceAlt,
    color: t.colors.ink,
  },
  send: { width: 44, height: 44, borderRadius: t.radius.md, alignItems: 'center', justifyContent: 'center' },
}));

// app/make-offer.tsx — Offer / counter-offer (doc §4.1, anchoring §1.5):
// asking price shown first as the anchor, 3 one-tap suggested amounts near it,
// custom amount, and a "Coach IA" tip.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  Card,
  Chip,
  IconButton,
  Price,
  Skeleton,
  TextField,
  showToast,
} from '@/components/ui';
import { coachAdvice, counterOffer, openNegotiation } from '@/lib/api/negotiations';
import { postByIdQuery } from '@/lib/api/posts';
import { conversationQuery } from '@/lib/api/conversations';
import { ApiError } from '@/lib/api';
import { formatAmount, formatNumber } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { BdCoachVerdict, BdNegotiation } from '@/constants/types';
import { createStyles, useStyles, useTheme } from '@/theme';

const roundTo500 = (n: number) => Math.max(500, Math.round(n / 500) * 500);

function coachErrorMessage(e: unknown): string {
  const status = e instanceof ApiError ? e.status : 0;
  if (status === 503) return "Le coach n'est pas disponible pour le moment.";
  if (status === 429) return 'Trop de demandes au coach — réessayez plus tard.';
  if (status === 409) return "L'offre a changé entre-temps.";
  return 'Impossible de contacter le coach. Réessayez.';
}

export default function MakeOfferScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const queryClient = useQueryClient();
  const { postId, negotiationId, conversationId } = useLocalSearchParams<{
    postId?: string;
    negotiationId?: string;
    conversationId?: string;
  }>();

  const isCounter = !!negotiationId;
  const cid = Number(conversationId);
  const [amountText, setAmountText] = useState('');
  const [message, setMessage] = useState('');
  const [coach, setCoach] = useState<BdCoachVerdict | null>(null);

  // Anchor data: the listing (new offer) or the conversation (counter-offer).
  const postQuery = useQuery({ ...postByIdQuery(Number(postId)), enabled: !isCounter && !!postId });
  const convQuery = useQuery({ ...conversationQuery(cid), enabled: isCounter && cid > 0 });

  const asking = isCounter ? convQuery.data?.post?.price ?? null : postQuery.data?.price ?? null;
  const title = isCounter ? convQuery.data?.post?.title : postQuery.data?.title;
  const currentOffer = isCounter ? convQuery.data?.latest_negotiation?.current_offer_amount ?? null : null;
  const anchorLoading = isCounter ? convQuery.isLoading && cid > 0 : postQuery.isLoading && !!postId;

  const suggestions = useMemo(() => {
    if (!asking || asking <= 0) return [];
    let raw: number[];
    if (isCounter && currentOffer && currentOffer > 0 && currentOffer !== asking) {
      // Meet in the middle: 25 / 50 / 75 % of the gap between offer and asking.
      const gap = asking - currentOffer;
      raw = [0.25, 0.5, 0.75].map((f) => currentOffer + gap * f);
    } else {
      raw = [0.95, 0.9, 0.85].map((f) => asking * f);
    }
    return Array.from(new Set(raw.map(roundTo500))).filter((n) => n > 0 && n !== asking);
  }, [asking, currentOffer, isCounter]);

  const amount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
  const canSubmit = Number.isFinite(amount) && amount > 0;
  const pct = canSubmit && asking ? Math.round(((amount - asking) / asking) * 100) : null;

  const mutation = useMutation({
    mutationFn: async (): Promise<BdNegotiation> => {
      const note = message.trim() || undefined;
      if (isCounter) {
        return counterOffer(Number(negotiationId), { amount, message: note });
      }
      return openNegotiation(Number(postId), { amount, message: note });
    },
    onSuccess: (neg) => {
      haptics.success();
      const convId = neg.conversation_id ?? (conversationId ? Number(conversationId) : null);
      if (convId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', convId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      showToast.success(isCounter ? 'Contre-offre envoyée' : 'Offre envoyée');
      if (isCounter) {
        router.back();
      } else if (convId) {
        router.replace({ pathname: '/chatroom', params: { conversationId: String(convId) } });
      } else {
        router.back();
      }
    },
    onError: (e: any) => {
      showToast.error('Échec', e?.message || 'Veuillez réessayer.');
    },
  });

  const coachMutation = useMutation({
    mutationFn: () => coachAdvice(Number(negotiationId)),
    onSuccess: setCoach,
    onError: (e) => showToast.error('Coach IA', coachErrorMessage(e)),
  });

  const pick = (n: number) => setAmountText(String(n));

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <AppText variant="h3" style={styles.flex} accessibilityRole="header">
            {isCounter ? 'Faire une contre-offre' : 'Faire une offre'}
          </AppText>
          <IconButton icon="close" label="Fermer" onPress={() => router.back()} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Anchor: the asking price comes first */}
          <Card tone="muted" style={styles.anchor}>
            {anchorLoading ? (
              <>
                <Skeleton width="40%" height={14} />
                <Skeleton width="60%" height={28} />
              </>
            ) : (
              <>
                {!!title && (
                  <AppText variant="small" color="inkMuted" numberOfLines={1}>
                    {title}
                  </AppText>
                )}
                <AppText variant="caption" color="inkMuted">
                  Prix demandé
                </AppText>
                {asking != null ? <Price amount={asking} size="lg" /> : <AppText variant="h2">—</AppText>}
                {currentOffer != null && (
                  <AppText variant="small" color="inkMuted">
                    Offre en cours : {formatAmount(currentOffer)}
                  </AppText>
                )}
              </>
            )}
          </Card>

          {suggestions.length > 0 && (
            <View style={styles.section}>
              <AppText variant="labelStrong">
                {isCounter ? 'Trouver un terrain d’entente' : 'Proposer en un geste'}
              </AppText>
              <View style={styles.chips} accessibilityRole="radiogroup">
                {suggestions.map((n) => (
                  <Chip key={n} label={formatAmount(n)} selected={amount === n} onPress={() => pick(n)} />
                ))}
              </View>
            </View>
          )}

          <TextField
            label="Votre proposition"
            value={canSubmit ? formatNumber(amount) : ''}
            onChangeText={(v) => setAmountText(v.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
            maxLength={15}
            right={
              <AppText variant="bodyStrong" color="inkMuted">
                FCFA
              </AppText>
            }
            helper={
              pct != null
                ? pct < 0
                  ? `${Math.abs(pct)} % sous le prix demandé`
                  : pct > 0
                    ? `${pct} % au-dessus du prix demandé`
                    : 'Le prix demandé'
                : undefined
            }
            containerStyle={styles.section}
            style={styles.amountInput}
          />

          <TextField
            label="Message (optionnel)"
            value={message}
            onChangeText={setMessage}
            placeholder={isCounter ? 'Expliquez votre proposition…' : 'Ajoutez un mot pour le vendeur…'}
            multiline
            maxLength={500}
            showCount
          />

          {/* Coach IA */}
          <Card tone="brand" style={styles.coach}>
            <View style={styles.coachTitle}>
              <Ionicons name="bulb-outline" size={18} color={t.colors.brandStrong} />
              <AppText variant="labelStrong" color="brandStrong">
                Coach IA
              </AppText>
            </View>
            {isCounter ? (
              coach ? (
                <>
                  <AppText variant="bodyStrong">
                    {coach.action === 'counter'
                      ? `Proposez ${formatAmount(coach.suggested_amount)}`
                      : coach.action === 'accept'
                        ? 'Bonne affaire — vous pourriez accepter'
                        : "Patientez — ne changez rien pour l'instant"}
                  </AppText>
                  <AppText variant="small" color="inkMuted">
                    {coach.rationale_fr}
                  </AppText>
                  {coach.market && (
                    <AppText variant="caption" color="inkMuted">
                      Marché : {formatAmount(coach.market.range_min)} – {formatAmount(coach.market.range_max)} ·{' '}
                      {coach.market.comparable_count} annonce{coach.market.comparable_count > 1 ? 's' : ''} similaire
                      {coach.market.comparable_count > 1 ? 's' : ''}
                    </AppText>
                  )}
                  {!!coach.warning && (
                    <AppText variant="caption" color="warning">
                      {coach.warning}
                    </AppText>
                  )}
                  {coach.action === 'counter' && !!coach.suggested_amount && (
                    <Button
                      label={`Utiliser ${formatAmount(coach.suggested_amount)}`}
                      variant="secondary"
                      size="sm"
                      onPress={() => pick(coach.suggested_amount!)}
                      style={styles.alignStart}
                    />
                  )}
                  <AppText variant="caption" color="inkSubtle">
                    Visible par vous seul. Le coach utilise les mêmes données pour l’acheteur et le vendeur.
                  </AppText>
                </>
              ) : (
                <>
                  <AppText variant="small" color="inkMuted">
                    Le coach compare l’offre aux annonces similaires et vous suggère un montant juste.
                  </AppText>
                  <Button
                    label={coachMutation.isPending ? 'Le coach regarde le marché…' : 'Demander conseil'}
                    variant="secondary"
                    size="sm"
                    loading={coachMutation.isPending}
                    onPress={() => coachMutation.mutate()}
                    style={styles.alignStart}
                  />
                </>
              )
            ) : (
              <AppText variant="small" color="inkMuted">
                Une offre raisonnable, proche du prix demandé, a plus de chances d’être acceptée. Un petit mot
                aimable aide aussi. Et ne payez jamais d’avance.
              </AppText>
            )}
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={
              canSubmit
                ? `${isCounter ? 'Envoyer la contre-offre' : "Envoyer l'offre"} · ${formatAmount(amount)}`
                : isCounter
                  ? 'Envoyer la contre-offre'
                  : "Envoyer l'offre"
            }
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!canSubmit}
            disabledReason="Choisissez ou saisissez un montant"
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: t.spacing.md, paddingRight: 4, minHeight: 56 },
  content: { padding: t.spacing.md, gap: t.spacing.md },
  anchor: { gap: 4 },
  section: { gap: t.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  amountInput: { fontSize: 22, fontWeight: '700' },
  coach: { gap: 6 },
  coachTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alignStart: { alignSelf: 'flex-start' },
  footer: {
    padding: t.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
}));

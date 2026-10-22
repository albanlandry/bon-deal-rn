// app/deal.tsx — the deal page, "Votre achat" / "Votre vente" (docs/11 §4.2,
// docs/12 layout): a full-width brand block with a flat bottom edge carries
// the status headline, the item thumbnail and the agreed amount; then the
// counterpart, the vertical timeline, the meeting card (editable while
// pending) and the safety card (always visible); the one next action sits in
// the floating ActionDock. Actions and sheets come from
// `useDealActions` (shared with TransactionPanel); the meeting is set with
// PATCH /transactions/{id}/meeting. Cached data stays on screen offline.
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppImage,
  AppText,
  Avatar,
  Button,
  Card,
  Celebrate,
  ErrorState,
  IconButton,
  PressableScale,
  ScreenHeader,
  Skeleton,
} from '@/components/ui';
import DealTimeline from '@/components/molecules/DealTimeline';
import { useDealActions } from '@/components/organisms/DealActions';
import MeetingSheet from '@/components/organisms/MeetingSheet';
import ActionDock, { dockBottom, DockButton } from '@/components/organisms/ActionDock';
import { useAuth } from '@/contexts/AuthContext';
import { postByIdQuery } from '@/lib/api/posts';
import {
  dealHeadline,
  formatMeetingWhen,
  parseServerDate,
  TXN_STATUS_LABEL,
} from '@/lib/api/transactions';
import { formatAmount, formatClock, formatDayLabel } from '@/lib/format';
import { coverThumb } from '@/lib/images';
import { useTheme } from '@/theme';

/** "Aujourd’hui, 15:12" / "12 octobre, 09:30" from a naive-UTC API date. */
function stamp(iso: string | null | undefined): string | null {
  const d = parseServerDate(iso);
  if (!d) return null;
  const s = d.toISOString();
  return `${formatDayLabel(s).replace("'", '’')}, ${formatClock(s)}`;
}

export default function DealScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const myId = user?.id;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const txnId = Number(id);
  const [celebrate, setCelebrate] = useState(0);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [dockH, setDockH] = useState(80);
  const insets = useSafeAreaInsets();
  // Translucent plate on the brand block (white in light, dark ink in dark).
  const heroPlate = t.isDark ? 'rgba(11,18,32,0.14)' : 'rgba(255,255,255,0.14)';

  const deal = useDealActions({ transactionId: txnId, myId, onCompleted: () => setCelebrate(Date.now()) });
  const { q, txn, reviewed, iAmSeller, otherName, busy, confirm, confirming, openSheet, sheets } = deal;
  const post = useQuery({ ...postByIdQuery(txn?.post_id ?? 0), enabled: !!txn?.post_id });

  const title = txn ? (iAmSeller ? 'Votre vente' : 'Votre achat') : 'Affaire';

  if (!Number.isFinite(txnId) || txnId <= 0) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: t.colors.canvas }]}>
        <ScreenHeader title="Affaire" />
        <ErrorState message="Cette affaire est introuvable." />
      </SafeAreaView>
    );
  }

  if (q.isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: t.colors.canvas }]}>
        <ScreenHeader title={title} />
        <View style={styles.pad} accessibilityLabel="Chargement de l’affaire">
          <Skeleton width="50%" height={14} />
          <Skeleton width="80%" height={28} style={styles.mt8} />
          <Skeleton width="65%" height={16} style={styles.mt8} />
          <Skeleton height={160} radius={t.radius.md} style={styles.mt16} />
          <Skeleton height={72} radius={t.radius.md} style={styles.mt12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!txn) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: t.colors.canvas }]}>
        <ScreenHeader title={title} />
        <ErrorState message="Impossible de charger cette affaire." onRetry={() => q.refetch()} />
      </SafeAreaView>
    );
  }

  const other = iAmSeller ? txn.buyer : txn.seller;
  const pending = txn.status === 'pending';
  const headline = dealHeadline(txn, iAmSeller);
  const place = txn.meeting_location?.trim() || null;
  const at = parseServerDate(txn.meeting_at);
  const amount = formatAmount(txn.amount);
  // The place is already the headline when there is no time.
  const placeInLine = at && place ? `${place} · ` : '';
  const subline = pending
    ? `${placeInLine}${amount} à ${iAmSeller ? 'recevoir' : 'remettre'} sur place`
    : `Montant convenu : ${amount}`;

  const details = [
    stamp(txn.created_at),
    txn.status === 'pending'
      ? iAmSeller
        ? 'Laissez l’acheteur vérifier l’objet'
        : 'Vérifiez l’objet avant de payer'
      : txn.status === 'cancelled'
        ? txn.cancellation_reason || stamp(txn.cancelled_at)
        : stamp(txn.completed_at),
    txn.status === 'disputed'
      ? 'L’équipe BonDeal examine la situation'
      : txn.status === 'completed'
        ? reviewed
          ? 'Merci pour votre avis'
          : `Partagez votre expérience avec ${otherName}`
        : txn.status === 'pending'
          ? 'Après la rencontre'
          : null,
  ];

  const listingPlace = [post.data?.pickup_location_note, post.data?.pickup_quartier].filter(Boolean).join(', ') || null;
  const thumb = coverThumb(post.data?.images);
  const openListing = () => router.push({ pathname: '/item-details', params: { id: String(txn.post_id) } });
  const openProfile = () =>
    other &&
    router.push({
      pathname: '/seller-profile',
      params: { userId: String(other.id), username: other.username ?? '' },
    } as unknown as Href);

  const bar = pending ? (
    <>
      <DockButton
        label="Annuler"
        variant="glass"
        grow={false}
        onPress={() => openSheet('cancel')}
        disabled={busy}
        accessibilityHint={iAmSeller ? 'Annuler la vente' : 'Annuler l’achat'}
      />
      <DockButton
        label={iAmSeller ? 'Vente conclue' : 'J’ai reçu l’objet'}
        icon="checkmark-done"
        onPress={confirm}
        loading={confirming}
        disabled={busy}
      />
    </>
  ) : txn.status === 'completed' ? (
    <>
      <DockButton label="Un problème ?" variant="glass" grow={reviewed} onPress={() => openSheet('dispute')} disabled={busy} />
      {!reviewed && <DockButton label="Laisser un avis" icon="star-outline" onPress={() => openSheet('review')} />}
    </>
  ) : (
    <DockButton label="Voir l’annonce" variant="glass" onPress={openListing} />
  );

  const onHero = t.colors.onBrand;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/transactions' as Href));

  return (
    <View style={[styles.flex, { backgroundColor: t.colors.canvas }]}>
      <StatusBar style={t.isDark ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: dockH + dockBottom(insets.bottom) + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={() => q.refetch()}
            colors={[t.colors.brandStrong]}
            tintColor={onHero}
            progressViewOffset={insets.top}
          />
        }>
        {/* Status block: full-width brand colour, flat bottom edge */}
        <View style={[styles.hero, { backgroundColor: t.colors.brand, paddingTop: insets.top + 4 }]}>
          <View style={styles.heroTop}>
            <IconButton icon="arrow-back" label="Retour" color="onBrand" onPress={goBack} />
            <AppText variant="bodyStrong" style={[styles.flex, { color: onHero }]} accessibilityRole="header">
              {title}
            </AppText>
            <View style={[styles.statusTag, { borderColor: onHero, borderRadius: t.radius.xs }]}>
              <AppText variant="captionStrong" style={{ color: onHero }}>
                {TXN_STATUS_LABEL[txn.status] ?? txn.status}
              </AppText>
            </View>
          </View>
          <View style={styles.heroBody}>
            <AppText variant="h2" style={{ color: onHero }}>
              {headline}
            </AppText>
            <AppText variant="small" style={[styles.mt4, { color: onHero, opacity: 0.88 }]}>
              {subline}
            </AppText>
            <PressableScale
              accessibilityRole="link"
              accessibilityLabel={`Voir l’annonce ${txn.post_title ?? ''}, montant convenu ${amount}`}
              onPress={openListing}
              style={[styles.heroItem, { backgroundColor: heroPlate, borderRadius: t.radius.md }]}>
              <AppImage uri={thumb} style={[styles.thumb, { borderRadius: t.radius.sm }]} recyclingKey={`p${txn.post_id}`} />
              <View style={styles.flex}>
                <AppText variant="priceLarge" style={{ color: onHero }} numberOfLines={1}>
                  {amount}
                </AppText>
                <AppText variant="small" style={{ color: onHero, opacity: 0.88 }} numberOfLines={1}>
                  {txn.post_title ?? 'Annonce'}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={onHero} />
            </PressableScale>
          </View>
        </View>

        {q.isError && (
          <AppText variant="caption" color="warning" style={[styles.pad, styles.mt12]}>
            Données hors ligne : tirez pour actualiser.
          </AppText>
        )}

        {/* Counterpart */}
        {!!other && (
          <View style={[styles.pad, styles.mt16]}>
            <Card padded={false}>
              <PressableScale
                accessibilityRole="link"
                accessibilityLabel={`Voir le profil de ${other.username}`}
                onPress={openProfile}
                style={styles.itemRow}>
                <Avatar uri={other.avatar_url} name={other.username} size={40} />
                <View style={styles.flex}>
                  <AppText variant="labelStrong" numberOfLines={1}>
                    {other.username}
                  </AppText>
                  <AppText variant="caption" color="inkMuted">
                    {iAmSeller ? 'Acheteur' : 'Vendeur'}
                    {other.review_count ? ` · ${(other.avg_rating ?? 0).toFixed(1).replace('.', ',')} ★ (${other.review_count} avis)` : ''}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
              </PressableScale>
            </Card>
          </View>
        )}

        {/* Timeline */}
        <View style={[styles.pad, styles.mt12]}>
          <Card>
            <AppText variant="captionStrong" color="inkMuted" style={styles.cardTitle}>
              Étapes
            </AppText>
            <DealTimeline status={txn.status} reviewed={reviewed} vertical details={details} />
          </Card>
        </View>

        {/* Meeting */}
        {(pending || at || place) && (
          <View style={[styles.pad, styles.mt12]}>
            <Card style={styles.meeting}>
              <View style={[styles.meetIcon, { backgroundColor: t.colors.brandTint, borderRadius: t.radius.sm }]}>
                <Ionicons name="location-outline" size={20} color={t.colors.brandStrong} />
              </View>
              <View style={styles.flex}>
                <AppText variant="labelStrong">Rendez-vous</AppText>
                {at || place ? (
                  <>
                    {!!at && (
                      <AppText variant="small" color="ink">
                        {formatMeetingWhen(at).replace(/^./, (c) => c.toUpperCase())}
                      </AppText>
                    )}
                    {!!place && (
                      <AppText variant="small" color={at ? 'inkMuted' : 'ink'}>
                        {place}
                      </AppText>
                    )}
                  </>
                ) : (
                  <AppText variant="small" color="inkMuted">
                    Convenez d’un lieu et d’une heure avec {otherName}.
                  </AppText>
                )}
              </View>
              {pending && (
                <Button
                  label={at || place ? 'Modifier' : 'Fixer'}
                  size="sm"
                  variant="secondary"
                  onPress={() => setMeetingOpen(true)}
                  accessibilityHint="Choisir le lieu, le jour et l’heure du rendez-vous"
                />
              )}
            </Card>
          </View>
        )}

        {/* Safety: never hidden */}
        <View style={[styles.pad, styles.mt12]}>
          <Card tone="trust" style={styles.safety} accessibilityRole="text">
            <Ionicons name="shield-checkmark-outline" size={20} color={t.colors.trust} />
            <AppText variant="caption" color="trust" style={styles.flex}>
              Rencontrez-vous dans un lieu public, de jour si possible. Vérifiez l’objet avant de payer. Ne payez jamais
              d’avance.
            </AppText>
          </Card>
        </View>
      </ScrollView>

      {/* Next action */}
      <ActionDock safety={pending ? 'Vérifiez l’objet avant de payer. Jamais d’avance.' : undefined} onHeight={setDockH}>
        {bar}
      </ActionDock>

      {sheets}
      {pending && <MeetingSheet visible={meetingOpen} onClose={() => setMeetingOpen(false)} txn={txn} listingPlace={listingPlace} />}
      <Celebrate trigger={celebrate} haptic={false} onDone={() => setCelebrate(0)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  hero: { paddingBottom: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingRight: 16, minHeight: 56 },
  heroBody: { paddingHorizontal: 16, paddingTop: 4 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  heroItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 12, marginTop: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56 },
  thumb: { width: 56, height: 56 },
  cardTitle: { marginBottom: 8 },
  meeting: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meetIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  safety: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },
});

// app/seller-profile.tsx — Public seller profile (MB-PRF-02, MB-TS-01/02).
// GET /users/{id}/profile: only the fields the API returns are shown (no
// invented numbers). Social proof first (rating, sales, response time), then
// the seller's listings and latest reviews. Report / block live in the
// overflow menu, away from the main path.
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  ListingCard,
  ListRow,
  ScreenHeader,
  Sheet,
  Skeleton,
} from '@/components/ui';
import ProfileStat from '@/components/molecules/ProfileStat';
import ReportSheet from '@/components/organisms/ReportSheet';
import ReviewCard from '@/components/molecules/ReviewCard';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, apiFetch } from '@/lib/api';
import { publicProfileQuery } from '@/lib/api/account';
import { userReviewsInfiniteQuery } from '@/lib/api/reviews';
import { formatMemberSince, formatResponseTime } from '@/lib/format';
import { useBlockActions } from '@/lib/useBlock';
import type { BdPostListResponse } from '@/constants/types';
import { useTheme } from '@/theme';

/** This seller's published listings, whatever their city (GET /posts?owner_id=). */
function sellerListingsQuery(userId: number) {
  return {
    queryKey: ['posts', 'seller', userId],
    queryFn: async () => {
      const res = await apiFetch<BdPostListResponse>(`/posts?page=1&limit=50&owner_id=${userId}`);
      return res.posts;
    },
    enabled: userId > 0,
    staleTime: 60_000,
  };
}

export default function SellerProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { user: me } = useAuth();
  const params = useLocalSearchParams<{ userId?: string; username?: string }>();
  const userId = Number(params.userId);
  const isMe = me?.id === userId;

  const profile = useQuery(publicProfileQuery(userId));
  const p = profile.data;
  const listings = useQuery({ ...sellerListingsQuery(userId), enabled: !!p && !p.blocked_by_me });
  const reviews = useInfiniteQuery(userReviewsInfiniteQuery(userId));
  const reviewList = useMemo(() => reviews.data?.pages.flatMap((pg) => pg.reviews) ?? [], [reviews.data]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<{ type: 'user' | 'review'; id: number; subject?: string } | null>(null);
  const { confirmBlock, confirmUnblock, busy } = useBlockActions();

  const name = p?.display_name || p?.username || params.username || 'Membre';
  const place = [p?.quartier, p?.city].filter(Boolean).join(', ');
  const memberSince = formatMemberSince(p?.member_since);
  const responseTime = formatResponseTime(p?.response_time_minutes);

  const openReviews = () =>
    router.push({ pathname: '/reviews', params: { userId: String(userId), username: name } } as Href);

  const notFound = profile.error instanceof ApiError && profile.error.status === 404;

  if (!Number.isFinite(userId) || userId <= 0 || notFound) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
        <ScreenHeader title="Profil" />
        <EmptyState
          icon="person-remove-outline"
          title="Profil indisponible"
          message="Ce compte a été supprimé ou suspendu."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader
        title={p ? name : 'Profil'}
        right={
          !isMe && p ? (
            <IconButton icon="ellipsis-vertical" label="Plus d’actions" onPress={() => setMenuOpen(true)} />
          ) : undefined
        }
      />
      {profile.isLoading ? (
        <View style={styles.content}>
          <Skeleton height={120} radius={t.radius.md} />
          <View style={styles.stats}>
            <Skeleton height={72} style={styles.flex} radius={t.radius.md} />
            <Skeleton height={72} style={styles.flex} radius={t.radius.md} />
            <Skeleton height={72} style={styles.flex} radius={t.radius.md} />
          </View>
          <Skeleton height={180} radius={t.radius.md} />
        </View>
      ) : profile.isError || !p ? (
        <ErrorState message="Impossible de charger ce profil." onRetry={() => profile.refetch()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={profile.isRefetching}
              onRefresh={() => {
                profile.refetch();
                listings.refetch();
                reviews.refetch();
              }}
              colors={[t.colors.brandStrong]}
              tintColor={t.colors.brandStrong}
            />
          }>
          {/* Identity */}
          <Card style={styles.identity}>
            <Avatar uri={p.avatar_url} name={name} size={80} verified={p.phone_verified} />
            <View style={styles.identityText}>
              <AppText variant="h2" numberOfLines={1}>
                {name}
                {isMe ? ' (vous)' : ''}
              </AppText>
              {name !== p.username && (
                <AppText variant="small" color="inkMuted">
                  @{p.username}
                </AppText>
              )}
              {!!place && (
                <View style={styles.inline}>
                  <Ionicons name="location-outline" size={14} color={t.colors.inkMuted} />
                  <AppText variant="small" color="inkMuted" numberOfLines={1}>
                    {place}
                  </AppText>
                </View>
              )}
              <View style={styles.badges}>
                {p.phone_verified && <Badge label="Téléphone vérifié" tone="trust" icon="shield-checkmark" />}
                {!!memberSince && <Badge label={memberSince} tone="neutral" />}
              </View>
            </View>
          </Card>

          {p.blocked_by_me && (
            <Card tone="warning" style={styles.blocked}>
              <Ionicons name="ban-outline" size={20} color={t.colors.warning} />
              <View style={styles.flex}>
                <AppText variant="labelStrong">Vous avez bloqué ce membre</AppText>
                <AppText variant="caption" color="inkMuted">
                  Ses annonces sont masquées et vous ne pouvez pas échanger de messages.
                </AppText>
              </View>
              <Button label="Débloquer" size="sm" variant="secondary" onPress={() => confirmUnblock(userId, name)} disabled={busy} />
            </Card>
          )}

          {/* Social proof — real numbers only */}
          <View style={styles.stats}>
            <ProfileStat
              value={p.avg_rating != null && p.review_count > 0 ? p.avg_rating.toFixed(1).replace('.', ',') : '–'}
              label={p.review_count > 0 ? `★ · ${p.review_count} avis` : 'Pas d’avis'}
              onPress={openReviews}
            />
            <ProfileStat value={String(p.sales_count)} label={p.sales_count > 1 ? 'Ventes' : 'Vente'} />
            <ProfileStat
              value={String(p.active_listings)}
              label={p.active_listings > 1 ? 'Annonces' : 'Annonce'}
            />
          </View>
          {responseTime && (
            <Card tone="trust" style={styles.response}>
              <Ionicons name="time-outline" size={18} color={t.colors.trust} />
              <AppText variant="label">Répond en {responseTime}</AppText>
            </Card>
          )}

          {/* Listings */}
          {!p.blocked_by_me && (
            <View style={styles.section}>
              <AppText variant="h3" accessibilityRole="header">
                Ses annonces
              </AppText>
              {listings.isLoading ? (
                <View style={styles.row}>
                  <Skeleton width={160} height={200} radius={t.radius.md} />
                  <Skeleton width={160} height={200} radius={t.radius.md} />
                </View>
              ) : (listings.data?.length ?? 0) === 0 ? (
                <AppText variant="small" color="inkMuted">
                  {p.active_listings > 0
                    ? `${p.active_listings} annonce${p.active_listings > 1 ? 's' : ''} en ligne, dans une autre ville.`
                    : 'Aucune annonce en ligne pour le moment.'}
                </AppText>
              ) : (
                <FlatList
                  data={listings.data}
                  horizontal
                  keyExtractor={(x) => String(x.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.row}
                  renderItem={({ item }) => (
                    <ListingCard
                      post={item}
                      width={160}
                      onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}
                    />
                  )}
                />
              )}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="h3" accessibilityRole="header">
                Avis
              </AppText>
              {p.review_count > 3 && <Button label="Tout voir" variant="ghost" size="sm" onPress={openReviews} />}
            </View>
            {reviews.isLoading ? (
              <Skeleton height={100} radius={t.radius.md} />
            ) : reviewList.length === 0 ? (
              <AppText variant="small" color="inkMuted">
                Pas encore d’avis. Les avis sont laissés après une vente conclue.
              </AppText>
            ) : (
              reviewList.slice(0, 3).map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  onReport={
                    me && r.reviewer_id !== me.id
                      ? () => setReport({ type: 'review', id: r.id, subject: r.comment ?? undefined })
                      : undefined
                  }
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={name}>
        <ListRow
          icon="flag-outline"
          title="Signaler ce membre"
          subtitle="Arnaque, faux profil, harcèlement…"
          onPress={() => {
            setMenuOpen(false);
            setReport({ type: 'user', id: userId, subject: name });
          }}
        />
        {p?.blocked_by_me ? (
          <ListRow
            icon="lock-open-outline"
            title="Débloquer"
            onPress={() => {
              setMenuOpen(false);
              confirmUnblock(userId, name);
            }}
            last
          />
        ) : (
          <ListRow
            icon="ban-outline"
            title="Bloquer ce membre"
            subtitle="Il ne pourra plus vous écrire ni vous faire d’offre"
            destructive
            onPress={() => {
              setMenuOpen(false);
              confirmBlock(userId, name);
            }}
            last
          />
        )}
      </Sheet>

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  blocked: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stats: { flexDirection: 'row', gap: 8 },
  response: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  section: { marginTop: 8, gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { gap: 12 },
});

// app/seller-profile.tsx — Public seller profile (MB-PRF-02, MB-TS-01/02).
// GET /users/{id}/profile: only the fields the API returns are shown (no
// invented numbers). Social proof first (rating, sales, response time), then
// the seller's listings and latest reviews. Report / block live in the
// overflow menu, away from the main path.
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ListingCard,
  ListRow,
  ScreenHeader,
  Sheet,
  Skeleton,
} from '@/components/ui';
import ProfileHero, { PROFILE_HERO_OVERLAP, ProfileStatsCard } from '@/components/molecules/ProfileHero';
import ReportSheet from '@/components/organisms/ReportSheet';
import ReviewCard from '@/components/molecules/ReviewCard';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, apiFetch } from '@/lib/api';
import { publicProfileQuery } from '@/lib/api/account';
import { userReviewsInfiniteQuery } from '@/lib/api/reviews';
import { formatMemberSince, formatResponseTime } from '@/lib/format';
import { useBlockActions } from '@/lib/useBlock';
import type { BdPostListResponse } from '@/constants/types';
import { font, useTheme } from '@/theme';

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

/** A section that failed to load says so (never "Aucune annonce") and offers a retry. */
function SectionError({ message, onRetry, busy }: { message: string; onRetry: () => void; busy?: boolean }) {
  const t = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.sectionError, { backgroundColor: t.colors.dangerTint, borderRadius: t.radius.md }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={t.colors.danger} />
      <AppText variant="small" style={styles.flex}>
        {message}
      </AppText>
      <Button label="Réessayer" variant="ghost" size="sm" loading={busy} onPress={onRetry} />
    </View>
  );
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
  const listings = useQuery({
    ...sellerListingsQuery(userId),
    enabled: !!p && !p.blocked_by_me,
  });
  const reviews = useInfiniteQuery(userReviewsInfiniteQuery(userId));
  const reviewList = useMemo(() => reviews.data?.pages.flatMap((pg) => pg.reviews) ?? [], [reviews.data]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<{
    type: 'user' | 'review';
    id: number;
    subject?: string;
  } | null>(null);
  const { confirmBlock, confirmUnblock, busy } = useBlockActions();

  const name = p?.display_name || p?.username || params.username || 'Membre';
  const place = [p?.quartier, p?.city].filter(Boolean).join(', ');
  const memberSince = formatMemberSince(p?.member_since);
  const responseTime = formatResponseTime(p?.response_time_minutes);
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 32 - 12) / 2);

  const openReviews = () =>
    router.push({
      pathname: '/reviews',
      params: { userId: String(userId), username: name },
    } as Href);

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

  if (profile.isLoading || profile.isError || !p) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
        <ScreenHeader title="Profil" />
        {profile.isLoading ? (
          <View style={styles.content}>
            <Skeleton height={120} radius={t.radius.md} />
            <Skeleton height={84} radius={t.radius.md} />
            <Skeleton height={180} radius={t.radius.md} />
          </View>
        ) : (
          <ErrorState message="Impossible de charger ce profil." onRetry={() => profile.refetch()} />
        )}
      </SafeAreaView>
    );
  }

  const trustLine = [p.phone_verified ? '✓ Téléphone vérifié' : null, memberSince?.replace(/^Membre/, 'membre')]
    .filter(Boolean)
    .join(' · ');
  const handle = name !== p.username ? `@${p.username}` : null;

  return (
    <View style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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
        <ProfileHero
          back
          name={`${name}${isMe ? ' (vous)' : ''}`}
          avatarUri={p.avatar_url}
          lines={[[handle, place].filter(Boolean).join(' · '), trustLine]}
          actions={
            !isMe
              ? [
                  {
                    icon: 'ellipsis-vertical',
                    label: 'Plus d’actions',
                    onPress: () => setMenuOpen(true),
                  },
                ]
              : []
          }
        />
        <View style={[styles.content, { marginTop: -PROFILE_HERO_OVERLAP }]}>
          {/* Social proof — real numbers only */}
          <ProfileStatsCard
            items={[
              {
                value: p.avg_rating != null && p.review_count > 0 ? p.avg_rating.toFixed(1).replace('.', ',') : '–',
                label: p.review_count > 0 ? `${p.review_count} avis` : 'Pas d’avis',
                a11y:
                  p.avg_rating != null && p.review_count > 0
                    ? `Note ${p.avg_rating.toFixed(1)} sur 5, ${p.review_count} avis. Voir les avis`
                    : 'Pas encore d’avis',
                onPress: openReviews,
              },
              {
                value: p.sales_count,
                label: p.sales_count > 1 ? 'ventes' : 'vente',
                a11y: `${p.sales_count} vente${p.sales_count > 1 ? 's' : ''}`,
              },
              {
                value: p.active_listings,
                label: 'en ligne',
                a11y: `${p.active_listings} annonce${p.active_listings > 1 ? 's' : ''} en ligne`,
              },
            ]}
          />
          {responseTime && (
            <Card tone="trust" style={styles.response}>
              <Ionicons name="time-outline" size={18} color={t.colors.trust} />
              <AppText variant="label">Répond en {responseTime}</AppText>
            </Card>
          )}

          {p.blocked_by_me && (
            <Card tone="warning" style={styles.blocked}>
              <Ionicons name="ban-outline" size={20} color={t.colors.warning} />
              <View style={styles.flex}>
                <AppText variant="labelStrong">Vous avez bloqué ce membre</AppText>
                <AppText variant="caption" color="inkMuted">
                  Ses annonces sont masquées et vous ne pouvez pas échanger de messages.
                </AppText>
              </View>
              <Button
                label="Débloquer"
                size="sm"
                variant="secondary"
                onPress={() => confirmUnblock(userId, name)}
                disabled={busy}
              />
            </Card>
          )}

          {/* Listings */}
          {!p.blocked_by_me && (
            <View style={styles.section}>
              <AppText variant="h3" style={styles.sectionTitle} accessibilityRole="header">
                Ses annonces
              </AppText>
              {listings.isLoading ? (
                <View style={styles.grid}>
                  <Skeleton width={cardWidth} height={cardWidth * 1.4} radius={t.radius.md} />
                  <Skeleton width={cardWidth} height={cardWidth * 1.4} radius={t.radius.md} />
                </View>
              ) : listings.isError && !listings.data ? (
                <SectionError
                  message="Impossible de charger ses annonces."
                  busy={listings.isFetching}
                  onRetry={() => listings.refetch()}
                />
              ) : (listings.data?.length ?? 0) === 0 ? (
                <AppText variant="small" color="inkMuted">
                  {p.active_listings > 0
                    ? `${p.active_listings} annonce${p.active_listings > 1 ? 's' : ''} en ligne, dans une autre ville.`
                    : 'Aucune annonce en ligne pour le moment.'}
                </AppText>
              ) : (
                <View style={styles.grid}>
                  {listings.data!.map((item) => (
                    <ListingCard
                      key={item.id}
                      post={item}
                      width={cardWidth}
                      onPress={() =>
                        router.push({
                          pathname: '/item-details',
                          params: { id: String(item.id) },
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="h3" style={styles.sectionTitle} accessibilityRole="header">
                Avis
              </AppText>
              {p.review_count > 3 && <Button label="Tout voir" variant="ghost" size="sm" onPress={openReviews} />}
            </View>
            {reviews.isLoading ? (
              <Skeleton height={100} radius={t.radius.md} />
            ) : reviews.isError && reviewList.length === 0 ? (
              <SectionError
                message="Impossible de charger les avis."
                busy={reviews.isFetching}
                onRetry={() => reviews.refetch()}
              />
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
                      ? () =>
                          setReport({
                            type: 'review',
                            id: r.id,
                            subject: r.comment ?? undefined,
                          })
                      : undefined
                  }
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 32 },
  content: { paddingHorizontal: 16, gap: 12 },
  flex: { flex: 1 },
  blocked: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionTitle: { ...font('800') },
  response: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  section: { marginTop: 8, gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { gap: 12 },
  sectionError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    minHeight: 48,
  },
});

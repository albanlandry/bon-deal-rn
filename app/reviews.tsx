// app/reviews.tsx — Avis reçus par un utilisateur (MB-TRD-06)
// GET /users/{id}/reviews, newest first, infinite scroll. Summary numbers
// come from the API only (total + the profile's avg_rating, else the reviewee
// brief); nothing is invented. Reporting lives in each card's overflow menu.
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { publicProfileQuery } from '@/lib/api/account';
import { userReviewsInfiniteQuery } from '@/lib/api/reviews';
import { useTheme } from '@/theme';
import ReviewCard from '@/components/molecules/ReviewCard';
import ReportSheet from '@/components/organisms/ReportSheet';
import {
  AppText,
  Card,
  EmptyState,
  ErrorState,
  RatingStars,
  ScreenHeader,
  Skeleton,
} from '@/components/ui';

function ReviewSkeleton() {
  return (
    <Card style={styles.item}>
      <View style={styles.itemHeader}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={[styles.flex, { gap: 8 }]}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={10} />
        </View>
      </View>
      <Skeleton width="90%" height={12} />
      <Skeleton width="70%" height={12} />
    </Card>
  );
}

export default function ReviewsScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ userId?: string; username?: string }>();
  const userId = params.userId ? Number(params.userId) : user?.id;
  const isMe = userId === user?.id;
  const username = params.username || (isMe ? user?.username : undefined);

  const q = useInfiniteQuery(userReviewsInfiniteQuery(userId));
  const reviews = q.data?.pages.flatMap((p) => p.reviews) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;
  // The profile carries the authoritative average; the reviewee brief is a fallback.
  const profile = useQuery(publicProfileQuery(userId));
  const avg = profile.data?.avg_rating ?? reviews[0]?.reviewee?.avg_rating ?? null;

  const [reportId, setReportId] = useState<number | null>(null);

  const title = isMe ? 'Mes avis' : username ? `Avis sur ${username}` : 'Avis';

  const header =
    total > 0 ? (
      <Card tone="muted" style={styles.summary}>
        {avg != null && (
          <AppText variant="display" accessibilityLabel={`Note moyenne ${avg.toFixed(1)} sur 5`}>
            {avg.toFixed(1).replace('.', ',')}
          </AppText>
        )}
        <View style={styles.flex}>
          {avg != null && <RatingStars value={avg} showValue={false} size={18} />}
          <AppText variant="small" color="inkMuted">
            {total} avis reçu{total > 1 ? 's' : ''}
          </AppText>
        </View>
      </Card>
    ) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader large title={title} />
      {q.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <ReviewSkeleton key={i} />
          ))}
        </View>
      ) : q.isError ? (
        <ErrorState message="Impossible de charger les avis." onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              onReport={user && item.reviewer_id !== user.id ? () => setReportId(item.id) : undefined}
            />
          )}
          contentContainerStyle={[styles.list, reviews.length === 0 && styles.grow]}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              icon="star-outline"
              title="Pas encore d’avis"
              message={
                isMe
                  ? 'Après une vente ou un achat terminé, l’autre partie pourra vous laisser un avis.'
                  : 'Ce membre n’a pas encore reçu d’avis.'
              }
            />
          }
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? <ActivityIndicator color={t.colors.brandStrong} style={styles.footer} /> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching && !q.isFetchingNextPage}
              onRefresh={() => q.refetch()}
              tintColor={t.colors.brandStrong}
              colors={[t.colors.brandStrong]}
            />
          }
        />
      )}
      <ReportSheet
        visible={reportId != null}
        onClose={() => setReportId(null)}
        targetType="review"
        targetId={reportId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  grow: { flexGrow: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  item: { gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { paddingVertical: 16 },
  flex: { flex: 1 },
});

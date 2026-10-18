import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { userReviewSummaryQuery } from '@/lib/api/reviews';
import AppText from '../atoms/AppText';
import Avatar from '../atoms/Avatar';
import Card from '../atoms/Card';
import RatingStars from '../atoms/RatingStars';
import Skeleton from '../atoms/Skeleton';

export interface SellerCardProps {
  userId: number;
  username: string | null;
  city?: string | null;
  onPress?: () => void;
  isMe?: boolean;
}

/**
 * Social proof + uncertainty reduction: who you're dealing with. Only real
 * data is shown — rating and review count come from GET /users/{id}/reviews;
 * when the seller has no reviews yet we say so instead of inventing numbers.
 * (Response time / member-since / verified need a public-profile endpoint.)
 */
export default function SellerCard({ userId, username, city, onPress, isMe }: SellerCardProps) {
  const t = useTheme();
  const summary = useQuery(userReviewSummaryQuery(userId));
  const s = summary.data;
  return (
    <Card onPress={onPress} accessibilityLabel={`Vendeur ${username ?? ''}, voir les avis`}>
      <View style={styles.row}>
        <Avatar uri={s?.avatarUrl} name={username} size={52} />
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {username ?? 'Vendeur'}
            {isMe ? ' (vous)' : ''}
          </AppText>
          {summary.isLoading ? (
            <Skeleton width={120} height={12} style={{ marginTop: 6 }} />
          ) : s && s.total > 0 && s.avgRating != null ? (
            <RatingStars value={s.avgRating} count={s.total} />
          ) : (
            <AppText variant="caption" color="inkMuted">
              Pas encore d’avis
            </AppText>
          )}
          {!!city && (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={12} color={t.colors.inkMuted} />
              <AppText variant="caption" color="inkMuted">
                {city}
              </AppText>
            </View>
          )}
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});

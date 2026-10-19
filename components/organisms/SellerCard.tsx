import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { publicProfileQuery } from '@/lib/api/account';
import { formatMemberSince, formatResponseTime } from '@/lib/format';
import AppText from '../atoms/AppText';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
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
 * Social proof + uncertainty reduction: who you're dealing with. Every field
 * comes from GET /users/{id}/profile (rating, sales, response time, member
 * since, verified phone); a missing value is simply not shown.
 */
export default function SellerCard({ userId, username, city, onPress, isMe }: SellerCardProps) {
  const t = useTheme();
  const q = useQuery(publicProfileQuery(userId));
  const p = q.data;
  const name = p?.display_name || p?.username || username || 'Vendeur';
  const place = p ? [p.quartier, p.city].filter(Boolean).join(', ') : city;
  const response = formatResponseTime(p?.response_time_minutes);
  const since = formatMemberSince(p?.member_since);

  return (
    <Card onPress={onPress} accessibilityLabel={`Vendeur ${name}, voir le profil`}>
      <View style={styles.row}>
        <Avatar uri={p?.avatar_url} name={name} size={52} verified={!!p?.phone_verified} />
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
            {isMe ? ' (vous)' : ''}
          </AppText>
          {q.isLoading ? (
            <Skeleton width={120} height={12} style={{ marginTop: 6 }} />
          ) : p && p.review_count > 0 && p.avg_rating != null ? (
            <RatingStars value={p.avg_rating} count={p.review_count} />
          ) : (
            <AppText variant="caption" color="inkMuted">
              Pas encore d’avis
            </AppText>
          )}
          {!!place && (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={12} color={t.colors.inkMuted} />
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {place}
              </AppText>
            </View>
          )}
        </View>
        {onPress && <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />}
      </View>
      {p && (
        <View style={styles.badges}>
          {p.phone_verified && <Badge label="Téléphone vérifié" tone="trust" icon="shield-checkmark" />}
          {p.sales_count > 0 && (
            <Badge label={`${p.sales_count} vente${p.sales_count > 1 ? 's' : ''}`} tone="success" icon="bag-check-outline" />
          )}
          {!!response && <Badge label={`Répond en ${response}`} tone="neutral" icon="time-outline" />}
          {!!since && <Badge label={since} tone="neutral" />}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
});

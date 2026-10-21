import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { publicProfileQuery } from '@/lib/api/account';
import { formatMemberSince, formatResponseTime } from '@/lib/format';
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
 * Trust card (docs/09 §4, social proof + uncertainty reduction): avatar with
 * the teal verified ring, rating stars, then three facts — sales, response
 * time, member since. Every field comes from GET /users/{id}/profile; a
 * missing value is simply not shown (no fake social proof). Press scales the
 * card (Card → PressableScale); tap opens the seller profile.
 */
export default function SellerCard({ userId, username, city, onPress, isMe }: SellerCardProps) {
  const t = useTheme();
  const q = useQuery(publicProfileQuery(userId));
  const p = q.data;
  const name = p?.display_name || p?.username || username || 'Vendeur';
  const place = p ? [p.quartier, p.city].filter(Boolean).join(', ') : city;
  const response = formatResponseTime(p?.response_time_minutes);
  const since = formatMemberSince(p?.member_since);
  const verified = !!p?.phone_verified;

  const facts: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }[] = [];
  if (p && p.sales_count > 0)
    facts.push({ icon: 'bag-check-outline', value: String(p.sales_count), label: p.sales_count > 1 ? 'ventes' : 'vente' });
  if (response) facts.push({ icon: 'time-outline', value: response, label: 'pour répondre' });
  if (since) facts.push({ icon: 'calendar-outline', value: since.replace('Membre depuis ', ''), label: 'membre depuis' });

  return (
    <Card onPress={onPress} elevated accessibilityLabel={`Vendeur ${name}${verified ? ', téléphone vérifié' : ''}, voir le profil`}>
      <View style={styles.row}>
        <View
          style={[
            styles.ring,
            { borderColor: verified ? t.colors.trust : 'transparent' },
          ]}>
          <Avatar uri={p?.avatar_url} name={name} size={52} verified={verified} />
        </View>
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
          {verified && (
            <View style={styles.meta}>
              <Ionicons name="shield-checkmark" size={12} color={t.colors.trust} />
              <AppText variant="captionStrong" color="trust">
                Téléphone vérifié
              </AppText>
            </View>
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
      {facts.length > 0 && (
        <View style={[styles.facts, { borderTopColor: t.colors.line }]}>
          {facts.map((f, i) => (
            <View key={f.label} style={[styles.fact, i > 0 && { borderLeftColor: t.colors.line, borderLeftWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.factTop}>
                <Ionicons name={f.icon} size={14} color={t.colors.inkMuted} />
                <AppText variant="labelStrong" numberOfLines={1}>
                  {f.value}
                </AppText>
              </View>
              <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                {f.label}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { borderWidth: 2, borderRadius: 32, padding: 2 },
  text: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  facts: { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  fact: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  factTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

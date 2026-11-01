import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { publicProfileQuery } from '@/lib/api/account';
import { formatResponseTime } from '@/lib/format';
import AppText from '../atoms/AppText';
import Avatar from '../atoms/Avatar';
import Skeleton from '../atoms/Skeleton';
import PressableScale from '../motion/PressableScale';

export interface SellerCardProps {
  userId: number;
  username: string | null;
  city?: string | null;
  onPress?: () => void;
  isMe?: boolean;
}

/**
 * Seller on one line (docs/12 "Annonce"): round avatar, name with the teal
 * verified shield, then "★ 4,8 · 41 ventes · répond en ~1 h". Every fact
 * comes from GET /users/{id}/profile; a missing value is simply left out
 * (no invented social proof). Tap opens the seller profile.
 */
export default function SellerCard({ userId, username, city, onPress, isMe }: SellerCardProps) {
  const t = useTheme();
  const q = useQuery(publicProfileQuery(userId));
  const p = q.data;
  const name = p?.display_name || p?.username || username || 'Vendeur';
  const place = p ? [p.quartier, p.city].filter(Boolean).join(', ') : city;
  const response = formatResponseTime(p?.response_time_minutes);
  const verified = !!p?.phone_verified;

  const facts: string[] = [];
  if (p && p.review_count > 0 && p.avg_rating != null)
    facts.push(`★ ${p.avg_rating.toFixed(1).replace('.', ',')} (${p.review_count} avis)`);
  if (p && p.sales_count > 0) facts.push(`${p.sales_count} vente${p.sales_count > 1 ? 's' : ''}`);
  if (response) facts.push(`répond en ${response}`);
  const line = facts.length ? facts.join(' · ') : p ? 'Pas encore d’avis' : place || '';

  return (
    <PressableScale
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Vendeur ${name}${isMe ? ' (vous)' : ''}${verified ? ', téléphone vérifié' : ''}. ${line}${onPress ? '. Voir le profil' : ''}`}
      style={styles.row}>
      <Avatar uri={p?.avatar_url} name={name} size={44} />
      <View style={styles.text}>
        <View style={styles.nameRow}>
          <AppText variant="labelStrong" numberOfLines={1} style={styles.shrink}>
            {name}
            {isMe ? ' (vous)' : ''}
          </AppText>
          {verified && <Ionicons name="shield-checkmark" size={15} color={t.colors.trust} />}
        </View>
        {q.isLoading ? (
          <Skeleton width={160} height={12} style={styles.skel} />
        ) : (
          !!line && (
            <AppText variant="caption" color="inkMuted" numberOfLines={1}>
              {line}
            </AppText>
          )
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  text: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  skel: { marginTop: 4 },
});

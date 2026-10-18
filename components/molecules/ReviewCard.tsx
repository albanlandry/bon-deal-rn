import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { BdReview } from '@/constants/types';
import { formatDayLabel } from '@/lib/format';
import AppText from '../atoms/AppText';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Card from '../atoms/Card';
import IconButton from '../atoms/IconButton';
import RatingStars from '../atoms/RatingStars';

export interface ReviewCardProps {
  review: BdReview;
  /** Shows a discreet "Signaler l’avis" button. */
  onReport?: () => void;
}

/** One received review: who wrote it (buyer / seller), stars, comment. */
export default function ReviewCard({ review, onReport }: ReviewCardProps) {
  const name = review.reviewer?.username ?? 'Membre BonDeal';
  // direction = who wrote it: buyer_to_seller → written by the buyer.
  const role = review.direction === 'buyer_to_seller' ? 'Acheteur' : 'Vendeur';
  return (
    <Card style={styles.item}>
      <View style={styles.header}>
        <Avatar uri={review.reviewer?.avatar_url} name={name} size={40} />
        <View style={styles.flex}>
          <AppText variant="labelStrong" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" color="inkMuted">
            {formatDayLabel(review.created_at)}
          </AppText>
        </View>
        <Badge label={role} tone={role === 'Acheteur' ? 'brand' : 'trust'} />
        {onReport && (
          <IconButton icon="flag-outline" label="Signaler l’avis" color="inkSubtle" size={18} onPress={onReport} />
        )}
      </View>
      <RatingStars value={review.rating} showValue={false} size={16} />
      {!!review.comment && (
        <AppText variant="body" style={styles.comment}>
          {review.comment}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  comment: { marginTop: 2 },
  flex: { flex: 1 },
});

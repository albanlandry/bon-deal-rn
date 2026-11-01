import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BdReview } from '@/constants/types';
import { formatDayLabel } from '@/lib/format';
import AppText from '../atoms/AppText';
import Avatar from '../atoms/Avatar';
import Badge from '../atoms/Badge';
import Card from '../atoms/Card';
import IconButton from '../atoms/IconButton';
import ListRow from './ListRow';
import Sheet from '../organisms/Sheet';
import RatingStars from '../atoms/RatingStars';

export interface ReviewCardProps {
  review: BdReview;
  /** Adds an overflow menu ("…") with "Signaler l’avis". */
  onReport?: () => void;
}

/** One received review: who wrote it (buyer / seller), stars, comment. */
export default function ReviewCard({ review, onReport }: ReviewCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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
          <IconButton
            icon="ellipsis-horizontal"
            label={`Plus d’actions sur l’avis de ${name}`}
            color="inkSubtle"
            size={20}
            onPress={() => setMenuOpen(true)}
          />
        )}
      </View>
      <RatingStars value={review.rating} showValue={false} size={16} />
      {!!review.comment && (
        <AppText variant="body" style={styles.comment}>
          {review.comment}
        </AppText>
      )}
      {onReport && (
        <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={`Avis de ${name}`}>
          <ListRow
            icon="flag-outline"
            title="Signaler l’avis"
            subtitle="Faux avis, propos injurieux…"
            destructive
            onPress={() => {
              setMenuOpen(false);
              onReport();
            }}
            last
          />
        </Sheet>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  comment: { marginTop: 4 },
  flex: { flex: 1 },
});

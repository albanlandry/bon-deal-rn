import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { BdPost } from '@/constants/types';
import { formatAmount, formatRelativeTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import AppImage from '../atoms/AppImage';
import AppText from '../atoms/AppText';
import Badge from '../atoms/Badge';
import Price from '../atoms/Price';
import Skeleton from '../atoms/Skeleton';

export interface ListingCardProps {
  post: BdPost;
  onPress: () => void;
  onToggleLike?: () => void;
  width?: number;
  /** Show the owner's state badge (Brouillon, Vendu…) even for "published". */
  showState?: boolean;
}

/**
 * Jakob's law: familiar 2-column marketplace card. Image 4:3, price first,
 * then title, then place + time. "Gratuit" / "Échange" badges are visually
 * distinct (von Restorff).
 */
function ListingCardBase({ post, onPress, onToggleLike, width, showState }: ListingCardProps) {
  const t = useTheme();
  const place = post.pickup_quartier ?? post.city ?? null;
  const time = formatRelativeTime(post.created_at);
  const stateBadge =
    post.state === 'sold'
      ? { label: 'Vendu', tone: 'overlay' as const }
      : post.state === 'reserved'
        ? { label: 'Réservé', tone: 'warning' as const }
        : showState && post.state === 'draft'
          ? { label: 'Brouillon', tone: 'neutral' as const }
          : showState && post.state === 'unpublished'
            ? { label: 'Masquée', tone: 'neutral' as const }
            : null;
  const priceText = post.is_free ? 'Gratuit' : post.price != null ? formatAmount(post.price) : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${post.title}, ${priceText}${place ? `, ${place}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: t.colors.surface,
          borderColor: t.colors.line,
          borderRadius: t.radius.md,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View>
        <AppImage
          uri={post.images[0]?.url}
          style={styles.image}
          recyclingKey={String(post.id)}
        />
        {!post.images[0]?.url && (
          <View style={[StyleSheet.absoluteFill, styles.noImage]}>
            <Ionicons name="image-outline" size={28} color={t.colors.inkSubtle} />
          </View>
        )}
        <View style={styles.badges}>
          {post.is_free && <Badge label="Gratuit" tone="success" icon="gift-outline" />}
          {!!post.exchange_items && <Badge label="Échange" tone="trust" icon="swap-horizontal" />}
          {stateBadge && <Badge label={stateBadge.label} tone={stateBadge.tone} />}
        </View>
        {onToggleLike && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={post.liked_by_me ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            accessibilityState={{ selected: post.liked_by_me }}
            onPress={() => {
              haptics.light();
              onToggleLike();
            }}
            hitSlop={8}
            style={[styles.heart, { backgroundColor: t.colors.surface }]}>
            <Ionicons
              name={post.liked_by_me ? 'heart' : 'heart-outline'}
              size={18}
              color={post.liked_by_me ? t.colors.brandStrong : t.colors.ink}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Price amount={post.price} isFree={post.is_free} isExchange={!!post.exchange_items} size="sm" />
        <AppText variant="small" numberOfLines={2} style={styles.title}>
          {post.title}
        </AppText>
        <View style={styles.meta}>
          {place && (
            <>
              <Ionicons name="location-outline" size={12} color={t.colors.inkMuted} />
              <AppText variant="caption" color="inkMuted" numberOfLines={1} style={styles.flex}>
                {place}
                {time ? ` · ${time}` : ''}
              </AppText>
            </>
          )}
          {!place && !!time && (
            <AppText variant="caption" color="inkMuted">
              {time}
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const ListingCard = React.memo(ListingCardBase);
export default ListingCard;

export function ListingCardSkeleton({ width }: { width?: number }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { width, backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md },
      ]}>
      <Skeleton height={undefined} radius={0} style={styles.image} />
      <View style={[styles.body, { gap: 8 }]}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="60%" height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 4 / 3 },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  badges: { position: 'absolute', top: 8, left: 8, right: 48, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 10, gap: 2 },
  title: { minHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  flex: { flex: 1 },
});

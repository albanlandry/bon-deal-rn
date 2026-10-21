import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { BdPost } from '@/constants/types';
import { formatAmount, formatRelativeTime } from '@/lib/format';
import { coverThumb } from '@/lib/images';
import AppImage from '../atoms/AppImage';
import AppText from '../atoms/AppText';
import Badge from '../atoms/Badge';
import Price from '../atoms/Price';
import Skeleton from '../atoms/Skeleton';
import HeartBurst from '../motion/HeartBurst';
import PressableScale from '../motion/PressableScale';
import CategoryTag from './CategoryTag';

/** Fixed photo ratio (docs/09 §4 Home): nothing jumps while images load. */
export const CARD_PHOTO_RATIO = 4 / 5;

export interface ListingCardProps {
  post: BdPost;
  onPress: () => void;
  onToggleLike?: () => void;
  width?: number;
  /** Show the owner's state badge (Brouillon, Vendu…) even for "published". */
  showState?: boolean;
}

/** "850 m" / "1,2 km" / "12 km" (French decimal comma). */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Price-first marketplace card (docs/09 §4 Home, Jakob's law): fixed 4:5
 * photo with a badge row (state, Gratuit / Échange, category mnemonic) and an
 * optimistic heart with a burst; then price (bold, large), title on 2 lines,
 * place + time. Soft surface with depth; scales to 0.97 under the thumb.
 */
function ListingCardBase({ post, onPress, onToggleLike, width, showState }: ListingCardProps) {
  const t = useTheme();
  const cover = coverThumb(post.images);
  const distance = formatDistance(post.distance_km);
  const placeName = post.pickup_quartier ?? post.city ?? null;
  const place = distance ? (placeName ? `${distance} · ${placeName}` : distance) : placeName;
  const time = formatRelativeTime(post.created_at);
  const stateBadge =
    post.state === 'sold'
      ? { label: 'Vendu', tone: 'overlay' as const, icon: 'checkmark-done' as const }
      : post.state === 'reserved'
        ? { label: 'Réservé', tone: 'warning' as const, icon: 'time-outline' as const }
        : showState && post.state === 'draft'
          ? { label: 'Brouillon', tone: 'neutral' as const, icon: undefined }
          : showState && post.state === 'unpublished'
            ? { label: 'Masquée', tone: 'neutral' as const, icon: 'eye-off-outline' as const }
            : showState && post.state === 'expired'
              ? { label: 'Expirée', tone: 'danger' as const, icon: undefined }
              : null;
  const priceText = post.is_free ? 'Gratuit' : post.price != null ? formatAmount(post.price) : '';
  const category = post.categories?.[0];

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${priceText ? `${priceText}, ` : ''}${post.title}${place ? `, ${place}` : ''}${stateBadge ? `, ${stateBadge.label}` : ''}`}
      onPress={onPress}
      style={[
        styles.card,
        t.elevation.card as object,
        { width, backgroundColor: t.colors.surface, borderRadius: t.radius.lg },
      ]}>
      <View style={[styles.photo, { borderTopLeftRadius: t.radius.lg, borderTopRightRadius: t.radius.lg }]}>
        <AppImage uri={cover} style={styles.image} recyclingKey={String(post.id)} />
        {!cover && (
          <View style={[StyleSheet.absoluteFill, styles.noImage]}>
            <Ionicons name="image-outline" size={28} color={t.colors.inkSubtle} />
          </View>
        )}
        <View style={styles.badges} pointerEvents="none">
          {!!category && <CategoryTag value={category} iconOnly size={24} />}
          {stateBadge && <Badge label={stateBadge.label} tone={stateBadge.tone} icon={stateBadge.icon} />}
          {post.is_free && <Badge label="Gratuit" tone="success" icon="gift-outline" />}
          {!!post.exchange_items && <Badge label="Échange" tone="trust" icon="swap-horizontal" />}
        </View>
        {onToggleLike && (
          <HeartBurst
            liked={post.liked_by_me}
            onToggle={onToggleLike}
            size={18}
            box={36}
            background={t.colors.surface}
            style={styles.heart}
          />
        )}
      </View>
      <View style={styles.body}>
        <Price
          amount={post.price}
          isFree={post.is_free}
          isExchange={!!post.exchange_items}
          size="md"
          style={styles.price}
        />
        <AppText variant="small" numberOfLines={2} style={styles.title}>
          {post.title}
        </AppText>
        <View style={styles.meta}>
          {place ? (
            <>
              <Ionicons
                name={distance ? 'navigate-outline' : 'location-outline'}
                size={12}
                color={t.colors.inkMuted}
              />
              <AppText variant="caption" color="inkMuted" numberOfLines={1} style={styles.flex}>
                {place}
                {time ? ` · ${time}` : ''}
              </AppText>
            </>
          ) : time ? (
            <AppText variant="caption" color="inkMuted">
              {time}
            </AppText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const ListingCard = React.memo(ListingCardBase);
export default ListingCard;

/** Skeleton shaped exactly like the card (NN/g), with the shimmer. */
export function ListingCardSkeleton({ width }: { width?: number }) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        t.elevation.card as object,
        { width, backgroundColor: t.colors.surface, borderRadius: t.radius.lg },
      ]}>
      <View style={[styles.photo, { borderTopLeftRadius: t.radius.lg, borderTopRightRadius: t.radius.lg }]}>
        <Skeleton height="100%" radius={0} />
      </View>
      <View style={[styles.body, { gap: 8 }]}>
        <Skeleton width="55%" height={18} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="60%" height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  photo: { width: '100%', aspectRatio: CARD_PHOTO_RATIO, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  badges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 52,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  heart: { position: 'absolute', top: 6, right: 6 },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 2 },
  price: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  title: { minHeight: 40 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  flex: { flex: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { BdPost } from '@/constants/types';
import { formatAmount, formatRelativeTime } from '@/lib/format';
import { coverThumb, isReady } from '@/lib/images';
import { font } from '@/theme';
import AppImage from '../atoms/AppImage';
import AppText from '../atoms/AppText';
import Badge from '../atoms/Badge';
import Price from '../atoms/Price';
import Skeleton from '../atoms/Skeleton';
import HeartBurst from '../motion/HeartBurst';
import PressableScale from '../motion/PressableScale';
import CategoryTag from './CategoryTag';
import GradientView from './GradientView';

/** Fixed photo ratio (docs/09 §4 Home): nothing jumps while images load. */
export const CARD_PHOTO_RATIO = 4 / 5;

export type ListingCardVariant = 'default' | 'masonry' | 'hero';

export interface ListingCardProps {
  post: BdPost;
  /**
   * `default`: bordered grid card with a 4:5 photo. `masonry` (docs/12 fil
   * en quinconce): borderless, photo of `photoHeight` with tight corners,
   * price in bold under it, then title and place · time. `hero` (carrousel
   * "Nouveau près de vous"): `width` × `height` photo edge to edge with a dark
   * gradient, price and title on the image.
   */
  variant?: ListingCardVariant;
  /** masonry: photo height (from the photo ratio when known). */
  photoHeight?: number;
  /** hero: card height (default 176). */
  height?: number;
  onPress: () => void;
  onToggleLike?: () => void;
  width?: number;
  /** Show the owner's state badge (Brouillon, Vendu…) even for "published". */
  showState?: boolean;
  /**
   * Seller identity is verified (trust badge on the photo). Only pass true
   * when backed by API data; falls back to `post.owner_verified` if the API
   * sends it.
   */
  sellerVerified?: boolean;
}

/** "850 m" / "1,2 km" / "12 km" (French decimal comma). */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Price-first marketplace card, direction B "Confiance" (docs/11): 12 px
 * card with a hairline border, flat; 4:5 photo flush to the top edge with a
 * badge row top-left (category mnemonic, state, Gratuit / Échange, Vérifié)
 * and an optimistic heart top-right (44 dp); under the photo the price as a
 * bold tabular line, the title on 2 lines, then quartier · time. Scales to
 * 0.97 under the thumb.
 */
function ListingCardBase(props: ListingCardProps) {
  if (props.variant === 'masonry') return <MasonryCard {...props} />;
  if (props.variant === 'hero') return <HeroCard {...props} />;
  return <GridCard {...props} />;
}

/** Width / height of the cover photo when the API reports it (else null). */
export function coverAspect(post: BdPost): number | null {
  const img = (post.images ?? []).find(isReady) as (BdPost['images'][number] & { width?: number; height?: number }) | undefined;
  const w = Number(img?.width);
  const h = Number(img?.height);
  return w > 0 && h > 0 ? w / h : null;
}

function placeOf(post: BdPost): { place: string | null; distance: string | null } {
  const distance = formatDistance(post.distance_km);
  const placeName = post.pickup_quartier ?? post.city ?? null;
  return { distance, place: distance ? (placeName ? `${distance} · ${placeName}` : distance) : placeName };
}

function stateBadgeOf(post: BdPost, showState?: boolean) {
  return post.state === 'sold'
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
}

function priceTextOf(post: BdPost): string {
  return post.is_free ? 'Gratuit' : post.price != null ? formatAmount(post.price) : post.exchange_items ? 'Échange' : '';
}

/** Feed card for the masonry grid: no frame, the photo carries the shape. */
function MasonryCard({ post, onPress, onToggleLike, width, photoHeight, showState }: ListingCardProps) {
  const t = useTheme();
  const cover = coverThumb(post.images);
  const { place } = placeOf(post);
  const time = formatRelativeTime(post.created_at);
  const stateBadge = stateBadgeOf(post, showState);
  const priceText = priceTextOf(post);
  const h = photoHeight ?? Math.round((width ?? 160) * 1.25);
  const meta = [place, time].filter(Boolean).join(' · ');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${priceText ? `${priceText}, ` : ''}${post.title}${place ? `, ${place}` : ''}${stateBadge ? `, ${stateBadge.label}` : ''}`}
      onPress={onPress}
      style={{ width }}>
      <View style={[styles.mPhoto, { height: h, borderRadius: t.radius.md, backgroundColor: t.colors.skeleton }]}>
        <AppImage uri={cover} style={styles.image} recyclingKey={String(post.id)} />
        {!cover && (
          <View style={[StyleSheet.absoluteFill, styles.noImage]}>
            <Ionicons name="image-outline" size={28} color={t.colors.inkSubtle} />
          </View>
        )}
        <View style={styles.badges} pointerEvents="none">
          {stateBadge && <Badge label={stateBadge.label} tone={stateBadge.tone} icon={stateBadge.icon} />}
          {post.is_free && <Badge label="Gratuit" tone="success" icon="gift-outline" />}
          {!!post.exchange_items && <Badge label="Échange" tone="brand" icon="swap-horizontal" />}
        </View>
        {onToggleLike && (
          <HeartBurst
            liked={post.liked_by_me}
            onToggle={onToggleLike}
            size={18}
            box={44}
            background={t.colors.surface}
            style={styles.heart}
          />
        )}
      </View>
      <View style={styles.mBody}>
        {!!priceText && (
          <AppText
            numberOfLines={1}
            style={[styles.mPrice, { color: post.is_free ? t.colors.success : t.colors.ink }]}>
            {priceText}
          </AppText>
        )}
        <AppText variant="small" numberOfLines={1}>
          {post.title}
        </AppText>
        {!!meta && (
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            {meta}
          </AppText>
        )}
      </View>
    </PressableScale>
  );
}

/** Carousel card: photo edge to edge, dark gradient, price + title on it. */
function HeroCard({ post, onPress, width = 280, height = 176 }: ListingCardProps) {
  const t = useTheme();
  const cover = coverThumb(post.images);
  const { place } = placeOf(post);
  const priceText = priceTextOf(post);
  const sub = [post.title, place].filter(Boolean).join(' · ');
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${priceText ? `${priceText}, ` : ''}${post.title}${place ? `, ${place}` : ''}`}
      onPress={onPress}
      style={[styles.hero, { width, height, borderRadius: t.radius.md, backgroundColor: t.colors.skeleton }]}>
      <AppImage uri={cover} style={styles.image} recyclingKey={`hero-${post.id}`} />
      <GradientView
        colors={['rgba(15,27,45,0)', 'rgba(15,27,45,0.78)']}
        locations={[0.35, 1]}
        fallback="rgba(15,27,45,0.42)"
      />
      <View style={styles.heroText} pointerEvents="none">
        {!!priceText && (
          <AppText numberOfLines={1} style={styles.heroPrice} maxFontSizeMultiplier={1.2}>
            {priceText}
          </AppText>
        )}
        <AppText numberOfLines={1} style={styles.heroSub} maxFontSizeMultiplier={1.2}>
          {sub}
        </AppText>
      </View>
    </PressableScale>
  );
}

function GridCard({ post, onPress, onToggleLike, width, showState, sellerVerified }: ListingCardProps) {
  const t = useTheme();
  const verified = sellerVerified ?? (post as BdPost & { owner_verified?: boolean }).owner_verified === true;
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
      accessibilityLabel={`${priceText ? `${priceText}, ` : ''}${post.title}${place ? `, ${place}` : ''}${stateBadge ? `, ${stateBadge.label}` : ''}${verified ? ', vendeur vérifié' : ''}`}
      onPress={onPress}
      style={[
        styles.card,
        t.elevation.card as object,
        { width, backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md },
      ]}>
      <View style={[styles.photo, { borderTopLeftRadius: t.radius.md - 1, borderTopRightRadius: t.radius.md - 1 }]}>
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
          {!!post.exchange_items && <Badge label="Échange" tone="brand" icon="swap-horizontal" />}
          {verified && <Badge label="Vérifié" tone="trust" icon="shield-checkmark" />}
        </View>
        {onToggleLike && (
          <HeartBurst
            liked={post.liked_by_me}
            onToggle={onToggleLike}
            size={20}
            box={44}
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
export function ListingCardSkeleton({
  width,
  variant = 'default',
  photoHeight,
}: {
  width?: number;
  variant?: ListingCardVariant;
  photoHeight?: number;
}) {
  const t = useTheme();
  if (variant === 'masonry') {
    return (
      <View style={{ width }}>
        <Skeleton height={photoHeight ?? Math.round((width ?? 160) * 1.25)} radius={t.radius.md} />
        <View style={[styles.mBody, { gap: 6 }]}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="85%" height={12} />
        </View>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.card,
        t.elevation.card as object,
        { width, backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md },
      ]}>
      <View style={[styles.photo, { borderTopLeftRadius: t.radius.md - 1, borderTopRightRadius: t.radius.md - 1 }]}>
        <Skeleton height="100%" radius={0} />
      </View>
      <View style={[styles.body, { gap: 8 }]}>
        <Skeleton width="55%" height={16} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="60%" height={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  photo: { width: '100%', aspectRatio: CARD_PHOTO_RATIO, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  badges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 56,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  // 44 dp target; the visible disc stays inside the photo corner.
  heart: { position: 'absolute', top: 4, right: 4 },
  body: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 4 },
  price: { fontSize: 16, lineHeight: 20 },
  title: { minHeight: 40 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  flex: { flex: 1 },
  mPhoto: { width: '100%', overflow: 'hidden' },
  mBody: { paddingHorizontal: 2, paddingTop: 8, gap: 1 },
  mPrice: { ...font('700'), fontSize: 16, lineHeight: 21, fontVariant: ['tabular-nums'] },
  hero: { overflow: 'hidden' },
  heroText: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  heroPrice: { ...font('700'), fontSize: 20, lineHeight: 25, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  heroSub: { ...font('600'), fontSize: 14, lineHeight: 19, color: '#FFFFFF' },
});

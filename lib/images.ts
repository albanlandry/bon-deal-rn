/**
 * Pick the right size of a post photo. Direct uploads get WebP variants from
 * the worker (thumb 320 px, medium 800 px, large 1600 px); legacy photos only
 * have `url`. Lists use the thumbnail, the gallery the large one.
 */
import type { BdPostImage } from '@/constants/types';

export function thumbUrl(img: BdPostImage | null | undefined): string | null {
  if (!img) return null;
  return img.variants?.thumb || img.url || null;
}

export function largeUrl(img: BdPostImage | null | undefined): string | null {
  if (!img) return null;
  return img.variants?.large || img.variants?.medium || img.url || null;
}

/** Photos others can see (the owner also gets processing / failed ones). */
export function isReady(img: BdPostImage): boolean {
  return (img.status ?? 'ready') === 'ready' && !!(img.url || img.variants);
}

/** First displayable cover thumbnail of a post. */
export function coverThumb(images: BdPostImage[] | null | undefined): string | null {
  const first = (images ?? []).find(isReady);
  return thumbUrl(first);
}

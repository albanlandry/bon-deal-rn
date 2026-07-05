import type { BdPost } from '@/constants/types';
import { stateBadge } from '@/constants/catalog';
import { formatAmount, formatRelativeTime } from '@/lib/format';

export interface CardProps {
  id: string;
  imageUrl?: string;
  title: string;
  location: string;
  price: string;
  likes: number;
  views: number;
  comments: number;
  status: string;
  liked: boolean;
  postedDate: string;
}

/** Adapt a backend BdPost into the flat props the list cards render. */
export function toCardProps(post: BdPost): CardProps {
  return {
    id: String(post.id),
    imageUrl: post.images[0]?.url,
    title: post.title,
    location: post.pickup_quartier ?? post.city ?? 'Localisation non précisée',
    price: post.is_free ? 'Gratuit' : formatAmount(post.price),
    likes: post.likes_count,
    views: post.views_count,
    comments: post.offer_count,
    status: post.state,
    liked: post.liked_by_me,
    postedDate: formatRelativeTime(post.created_at),
  };
}

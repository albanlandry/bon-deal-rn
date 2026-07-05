import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BdPost, BdPriceCheck } from '@/constants/types';

interface PostResponse {
  success: boolean;
  message: string;
  post: BdPost;
}

export function postByIdQuery(id: number) {
  return queryOptions({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await apiFetch<PostResponse>(`/posts/${id}`);
      return res.post;
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

/** Ephemeral Bon prix ? verdict for a priced listing. */
export async function priceCheck(postId: number): Promise<BdPriceCheck> {
  const res = await apiFetch<{ success: boolean; price_check: BdPriceCheck }>(
    `/posts/${postId}/price_check`,
    { method: 'POST' },
  );
  return res.price_check;
}

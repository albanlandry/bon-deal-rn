import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { BdPost } from '@/constants/types';

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

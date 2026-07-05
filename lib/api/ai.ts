import { apiFetch } from '@/lib/api';
import type {
  BdAiDraft,
  BdBulkDraft,
  BdParsedSearch,
  BdPriceSuggestion,
} from '@/constants/types';

/** Upload local images to Supabase storage (auth'd) → public URLs. */
export async function uploadImages(uris: string[]): Promise<string[]> {
  const form = new FormData();
  uris.forEach((uri, i) =>
    form.append('files', { uri, name: `img_${i}.jpg`, type: 'image/jpeg' } as any),
  );
  const res = await apiFetch<{ uploaded_images: string[] }>('/upload', {
    method: 'POST',
    body: form,
  });
  return res.uploaded_images;
}

/** AI listing draft from already-uploaded photo URLs (POST /posts/ai_draft). */
export async function aiDraft(imageUrls: string[], hintTitle?: string): Promise<BdAiDraft> {
  const res = await apiFetch<{ success: boolean; draft: BdAiDraft }>('/posts/ai_draft', {
    method: 'POST',
    body: { image_urls: imageUrls, hint_title: hintTitle || undefined },
  });
  return res.draft;
}

export interface PriceSuggestionInput {
  categories: string[];
  title: string;
  condition?: string | null;
  age_bucket?: string | null;
}

/** Comparables-grounded price suggestion (POST /posts/price_suggestion). */
export async function priceSuggestion(input: PriceSuggestionInput): Promise<BdPriceSuggestion> {
  return apiFetch<BdPriceSuggestion>('/posts/price_suggestion', {
    method: 'POST',
    body: {
      categories: input.categories,
      title: input.title,
      condition: input.condition ?? undefined,
      age_bucket: input.age_bucket ?? undefined,
    },
  });
}

/** Boutique Éclair: 1-3 scene photos → up to 10 drafts (POST /posts/bulk_draft). */
export async function bulkDraft(imageUrls: string[]): Promise<BdBulkDraft[]> {
  const res = await apiFetch<{ success: boolean; drafts: BdBulkDraft[] }>('/posts/bulk_draft', {
    method: 'POST',
    body: { image_urls: imageUrls },
  });
  return res.drafts;
}

/** Trouve-moi ça: natural-language query → structured filters (POST /search/parse). */
export async function parseSearch(utterance: string): Promise<BdParsedSearch> {
  const res = await apiFetch<{ success: boolean; parsed: BdParsedSearch }>('/search/parse', {
    method: 'POST',
    body: { utterance },
  });
  return res.parsed;
}

import { coverThumb, largeUrl, thumbUrl } from '@/lib/images';
import type { BdPostImage } from '@/constants/types';

const legacy = { id: 1, url: 'https://cdn/x.jpg' } as BdPostImage;
const processed = {
  id: 2, url: 'https://cdn/m.webp', status: 'ready',
  variants: { thumb: 'https://cdn/t.webp', medium: 'https://cdn/m.webp', large: 'https://cdn/l.webp' },
} as BdPostImage;
const processing = { id: 3, url: '', status: 'processing', variants: null } as BdPostImage;

it('picks the thumbnail for lists and the large size for the gallery', () => {
  expect(thumbUrl(processed)).toBe('https://cdn/t.webp');
  expect(largeUrl(processed)).toBe('https://cdn/l.webp');
  expect(thumbUrl(legacy)).toBe('https://cdn/x.jpg'); // older photos only have url
});

it('never uses a photo that is still processing as the cover', () => {
  expect(coverThumb([processing, processed])).toBe('https://cdn/t.webp');
  expect(coverThumb([processing])).toBeNull();
  expect(coverThumb(undefined)).toBeNull();
});

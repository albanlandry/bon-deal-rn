import { foldChar, highlightParts } from '@/components/molecules/highlight';

describe('search highlight', () => {
  it('folds accents and case per character', () => {
    expect(foldChar('É')).toBe('e');
    expect(foldChar('ç')).toBe('c');
    expect(foldChar('x')).toBe('x');
  });

  it('highlights the typed part, accent-insensitively, keeping the original text', () => {
    expect(highlightParts('Réfrigérateur Samsung', 'refri')).toEqual([
      { text: 'Réfri', match: true },
      { text: 'gérateur Samsung', match: false },
    ]);
    expect(highlightParts('Table basse', 'BASSE')).toEqual([
      { text: 'Table ', match: false },
      { text: 'basse', match: true },
    ]);
  });

  it('returns the whole text when there is no match or no query', () => {
    expect(highlightParts('Lampe', 'frigo')).toEqual([{ text: 'Lampe', match: false }]);
    expect(highlightParts('Lampe', '  ')).toEqual([{ text: 'Lampe', match: false }]);
  });
});

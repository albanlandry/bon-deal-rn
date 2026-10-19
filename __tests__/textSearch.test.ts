import { normalizeText, sameName, searchByName } from '@/lib/textSearch';

const cities = [
  { name: 'Libreville' },
  { name: 'Port-Gentil' },
  { name: 'Lambaréné' },
  { name: 'Ndjolé' },
  { name: 'Franceville' },
];
const quartiers = [
  { name: 'Akébé-Ville' },
  { name: 'Akébé-Plaine' },
  { name: 'Nzeng-Ayong' },
  { name: 'Louis' },
  { name: 'Mont-Bouët' },
  { name: 'Glass' },
  { name: 'Œuvre' },
];
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe('accent-insensitive search', () => {
  it('normalizes case, accents and punctuation', () => {
    expect(normalizeText('Akébé-Ville')).toBe('akebe ville');
    expect(normalizeText('  MONT-BOUËT ')).toBe('mont bouet');
    expect(normalizeText("N'Toum")).toBe('n toum');
    expect(normalizeText('Œuvre')).toBe('oeuvre');
    expect(normalizeText(null)).toBe('');
  });

  it('finds cities without typing accents', () => {
    expect(names(searchByName(cities, 'lambarene', (c) => c.name))).toEqual(['Lambaréné']);
    expect(names(searchByName(cities, 'NDJOLE', (c) => c.name))).toEqual(['Ndjolé']);
    expect(names(searchByName(cities, 'port gentil', (c) => c.name))).toEqual(['Port-Gentil']);
  });

  it('finds quartiers by any word, prefix matches first', () => {
    expect(names(searchByName(quartiers, 'akebe', (q) => q.name))).toEqual(['Akébé-Ville', 'Akébé-Plaine']);
    expect(names(searchByName(quartiers, 'ville akebe', (q) => q.name))).toEqual(['Akébé-Ville']);
    expect(names(searchByName(quartiers, 'bouet', (q) => q.name))).toEqual(['Mont-Bouët']);
    expect(names(searchByName(cities, 'ville', (c) => c.name))).toEqual(['Libreville', 'Franceville']);
    expect(names(searchByName(quartiers, 'ou', (q) => q.name))).toEqual(['Louis', 'Mont-Bouët']);
  });

  it('returns everything for an empty query, nothing for no match', () => {
    expect(searchByName(cities, '  ', (c) => c.name)).toHaveLength(cities.length);
    expect(searchByName(cities, 'paris', (c) => c.name)).toEqual([]);
  });

  it('compares names loosely', () => {
    expect(sameName('Lambaréné', 'lambarene')).toBe(true);
    expect(sameName('Akébé-Ville', 'akebe ville')).toBe(true);
    expect(sameName('Libreville', 'Owendo')).toBe(false);
    expect(sameName(null, 'Owendo')).toBe(false);
  });
});

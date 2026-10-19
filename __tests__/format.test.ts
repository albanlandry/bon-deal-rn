import {
  THIN_SPACE, daysUntil, formatAmount, formatMemberSince, formatNumber, formatRelativeTime, formatResponseTime,
} from '@/lib/format';

describe('amounts', () => {
  it('groups thousands with a narrow no-break space and glues the unit', () => {
    expect(formatNumber(1500000)).toBe(`1${THIN_SPACE}500${THIN_SPACE}000`);
    expect(formatAmount(12500)).toBe(`12${THIN_SPACE}500 FCFA`);
  });

  it('shows a dash for missing values', () => {
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount(Number.NaN)).toBe('—');
  });
});

describe('dates', () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(new Date('2026-10-20T12:00:00Z')));
  afterAll(() => jest.useRealTimers());

  it('formats relative times in French', () => {
    expect(formatRelativeTime('2026-10-20T11:59:40Z')).toBe("à l'instant");
    expect(formatRelativeTime('2026-10-20T11:55:00Z')).toBe('Il y a 5 min');
    expect(formatRelativeTime('2026-10-20T09:00:00Z')).toBe('Il y a 3 h');
    expect(formatRelativeTime('2026-10-18T12:00:00Z')).toBe('Il y a 2 j');
    expect(formatRelativeTime('not a date')).toBe('');
  });

  it('counts days until a date', () => {
    expect(daysUntil('2026-10-23T12:00:00Z')).toBe(3);
    expect(daysUntil('2026-10-19T12:00:00Z')).toBe(-1);
    expect(daysUntil(null)).toBeNull();
  });

  it('formats member-since and reply time', () => {
    expect(formatMemberSince('2025-03-04T00:00:00Z')).toBe('Membre depuis mars 2025');
    expect(formatResponseTime(14)).toBe('~14 min');
    expect(formatResponseTime(150)).toBe('~3 h');
    expect(formatResponseTime(60 * 50)).toBe('~2 j');
    expect(formatResponseTime(null)).toBeNull();
  });
});

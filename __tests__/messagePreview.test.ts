import type { BdConversation, BdLastMessage } from '@/constants/types';
import { dealHeadline, formatMeetingWhen, meetingSummary, parseServerDate } from '@/lib/api/transactions';
import { lastMessagePreview, renderSystemMessage } from '@/lib/messagePreview';

const conv = (last?: Partial<BdLastMessage> | null): BdConversation => ({
  id: 1,
  post: { id: 2, title: 'Vélo', price: 30000, is_free: false, state: 'published', city: 'Libreville', thumbnail_url: null },
  buyer_id: 10,
  seller_id: 20,
  role: 'seller',
  counterparty: { id: 10, username: 'awa' } as BdConversation['counterparty'],
  last_message_at: null,
  last_message:
    last === null || last === undefined
      ? (last as null | undefined)
      : { id: 5, sender_id: 10, kind: 'text', body: 'Salut', payload: null, created_at: null, read_at: null, is_mine: false, ...last },
  created_at: null,
  unread_count: 0,
  latest_negotiation: null,
});

describe('lastMessagePreview', () => {
  it('is null without a last message (empty chat or older API)', () => {
    expect(lastMessagePreview(conv(null), 20)).toBeNull();
    expect(lastMessagePreview(conv(undefined), 20)).toBeNull();
  });

  it('shows the body, prefixed with "Vous :" for my own messages', () => {
    expect(lastMessagePreview(conv({ body: 'Toujours\n dispo ?' }), 20)).toBe('Toujours dispo ?');
    expect(lastMessagePreview(conv({ body: 'Oui', sender_id: 20, is_mine: true }), 20)).toBe('Vous : Oui');
  });

  it('is null for a blank text body', () => {
    expect(lastMessagePreview(conv({ body: '   ' }), 20)).toBeNull();
  });

  it('describes offers with the counterparty name and amount', () => {
    const text = lastMessagePreview(
      conv({ kind: 'system_offer_made', sender_id: null, body: null, payload: { by_user_id: 10, amount: 25000 } }),
      20,
    );
    expect(text).toMatch(/^awa a fait une offre de 25\s000\sFCFA$/);
    expect(
      lastMessagePreview(conv({ kind: 'system_accepted', sender_id: null, body: null, payload: { amount: 28000 } }), 20),
    ).toMatch(/^Offre acceptée — 28\s000\sFCFA$/);
  });
});

describe('meeting messages', () => {
  // Local time: built from components so the test passes in any time zone.
  const now = new Date(2026, 9, 22, 10, 0);
  const iso = (d: Date) => d.toISOString().replace('Z', ''); // API: naive UTC

  it('reads naive API timestamps as UTC', () => {
    expect(parseServerDate('2026-10-23T17:00:00')?.toISOString()).toBe('2026-10-23T17:00:00.000Z');
    expect(parseServerDate('2026-10-23T17:00:00+01:00')?.toISOString()).toBe('2026-10-23T16:00:00.000Z');
    expect(parseServerDate(null)).toBeNull();
    expect(parseServerDate('nope')).toBeNull();
  });

  it('says today / tomorrow / the date, with a French clock', () => {
    expect(formatMeetingWhen(new Date(2026, 9, 22, 18, 0), now)).toBe('aujourd’hui à 18\u00A0h');
    expect(formatMeetingWhen(new Date(2026, 9, 23, 9, 30), now)).toBe('demain à 9\u00A0h\u00A030');
    expect(formatMeetingWhen(new Date(2026, 9, 30, 18, 0), now)).toBe('le 30/10 à 18\u00A0h');
  });

  it('renders system_meeting_set as a sentence, and the cleared case', () => {
    const at = iso(new Date(2026, 9, 30, 18, 0));
    const text = renderSystemMessage(
      { kind: 'system_meeting_set', payload: { meeting_at: at, meeting_location: 'Rond-point de Louis', by_user_id: 10 } },
      undefined,
      20,
      now,
    );
    expect(text).toBe('Rendez-vous fixé : le 30/10 à 18\u00A0h · Rond-point de Louis');
    expect(renderSystemMessage({ kind: 'system_meeting_set', payload: { meeting_at: null, meeting_location: null } }, undefined, 20)).toBe(
      'Rendez-vous retiré',
    );
    expect(
      lastMessagePreview(
        conv({ kind: 'system_meeting_set', sender_id: null, body: null, payload: { meeting_location: 'Mbolo', meeting_at: null } }),
        20,
      ),
    ).toBe('Rendez-vous fixé : Mbolo');
  });

  it('builds the deal headline from status and meeting', () => {
    const base = { status: 'pending', meeting_at: null, meeting_location: null } as any;
    expect(dealHeadline(base, false, now)).toBe('Fixez un rendez-vous');
    expect(dealHeadline({ ...base, meeting_location: 'Mbolo' }, false, now)).toBe('Rendez-vous : Mbolo');
    expect(dealHeadline({ ...base, meeting_at: iso(new Date(2026, 9, 22, 18, 0)) }, false, now)).toBe(
      'Rendez-vous aujourd’hui à 18\u00A0h',
    );
    expect(dealHeadline({ ...base, status: 'completed' }, true, now)).toBe('Vente conclue');
    expect(dealHeadline({ ...base, status: 'cancelled' }, false, now)).toBe('Achat annulé');
    expect(meetingSummary({ meeting_at: null, meeting_location: '  ' })).toBeNull();
  });
});

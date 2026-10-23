import { ApiError } from '@/lib/api';
import {
  appointmentErrorMessage,
  appointmentSentence,
  appointmentShareText,
  appointmentSummary,
  isStaleAppointmentError,
  placeSummary,
} from '@/lib/api/appointments';
import { renderSystemMessage } from '@/lib/messagePreview';

// The API sends naive UTC ISO strings; build them from local times so the
// expectations hold in any timezone.
const naiveUtc = (d: Date) => d.toISOString().slice(0, 19);
const now = new Date(2026, 9, 23, 10, 0);
const tomorrow18 = naiveUtc(new Date(2026, 9, 24, 18, 0));
const tomorrow1930 = naiveUtc(new Date(2026, 9, 24, 19, 30));
const louis = { kind: 'relative' as const, name: 'Rond-point de Louis', details: 'devant la pharmacie' };

describe('placeSummary', () => {
  it('reads both kinds, details in brackets', () => {
    expect(placeSummary(louis)).toBe('Rond-point de Louis (devant la pharmacie)');
    expect(placeSummary({ kind: 'exact', address: '12 rue Ange Mba', details: null })).toBe('12 rue Ange Mba');
  });
  it('is null without a main part', () => {
    expect(placeSummary(null)).toBeNull();
    expect(placeSummary({ kind: 'relative', name: '  ', details: 'x' })).toBeNull();
  });
});

describe('appointmentSummary', () => {
  it('joins when and where', () => {
    expect(appointmentSummary({ starts_at: tomorrow18, place: louis }, now)).toBe(
      'demain à 18 h · Rond-point de Louis (devant la pharmacie)',
    );
    expect(appointmentSummary({ starts_at: tomorrow18, place: null }, now)).toBe('demain à 18 h');
  });
});

describe('appointmentSentence', () => {
  it('speaks for me or the other party', () => {
    const p = { event: 'proposed', by_user_id: 7, starts_at: tomorrow18, place: louis };
    expect(appointmentSentence(p, 7, 'awa', now)).toBe(
      'Vous proposez un rendez-vous : demain à 18 h · Rond-point de Louis (devant la pharmacie)',
    );
    expect(appointmentSentence(p, 9, 'awa', now)).toMatch(/^awa propose un rendez-vous : demain/);
  });

  it('shows what changed, old → new', () => {
    const p = {
      event: 'updated',
      by_user_id: 9,
      starts_at: tomorrow1930,
      place: null,
      previous: { starts_at: tomorrow18, place: louis },
    };
    expect(appointmentSentence(p, 7, 'awa', now)).toBe(
      'awa a modifié le rendez-vous : 18 h → 19 h 30, lieu retiré',
    );
  });

  it('covers confirmation, cancellation and the follow-up', () => {
    expect(appointmentSentence({ event: 'confirmed', starts_at: tomorrow18 }, 7, 'awa', now)).toBe(
      'Rendez-vous confirmé : demain à 18 h — annonce réservée',
    );
    expect(appointmentSentence({ event: 'cancelled', by_user_id: 9, reason: 'Malade' }, 7, 'awa', now)).toBe(
      'awa a annulé le rendez-vous : « Malade »',
    );
    expect(appointmentSentence({ event: 'follow_up' }, 7, 'awa', now)).toBe('La vente a-t-elle eu lieu ?');
  });

  it('is what the chat shows for system_appointment', () => {
    const conv = { counterparty: { id: 9, username: 'awa' } } as any;
    const msg = { kind: 'system_appointment' as const, payload: { event: 'sold' } };
    expect(renderSystemMessage(msg, conv, 7, now)).toBe('Vente conclue');
  });
});

describe('share text', () => {
  it('names the listing, the other party and the meeting', () => {
    expect(appointmentShareText({ starts_at: tomorrow18, place: louis }, 'Vélo', 'awa', now)).toBe(
      'Rendez-vous BonDeal pour « Vélo » — avec awa — demain à 18 h · Rond-point de Louis (devant la pharmacie)',
    );
  });
});

describe('errors', () => {
  it('maps codes to French and flags stale versions', () => {
    const changed = new ApiError(409, 'x', 'appointment_changed' as any);
    expect(isStaleAppointmentError(changed)).toBe(true);
    expect(appointmentErrorMessage(changed)).toMatch(/modifié entre-temps/);
    const reserved = new ApiError(409, 'x', 'post_already_reserved' as any);
    expect(isStaleAppointmentError(reserved)).toBe(false);
    expect(appointmentErrorMessage(reserved)).toBe('Trop tard : l’annonce vient d’être réservée.');
  });
});

describe('cancellation reasons', () => {
  it('reads system codes in French and keeps typed reasons', () => {
    const { cancellationReasonLabel } = require('@/lib/api/transactions');
    expect(cancellationReasonLabel('appointment_cancelled')).toBe('Rendez-vous annulé');
    expect(cancellationReasonLabel('not_sold')).toBe('Vente non conclue');
    expect(cancellationReasonLabel('Plus disponible')).toBe('Plus disponible');
    expect(cancellationReasonLabel('  ')).toBeNull();
  });
});

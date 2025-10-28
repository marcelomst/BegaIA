import { describe, it, expect } from 'vitest';
import { getCurrentReservation, buildReservationCopySummary } from '@/lib/handlers/pipeline/stateSelectors';

describe('stateSelectors', () => {
    it('getCurrentReservation prioriza pre.st.reservationSlots sobre nextSlots', () => {
        const pre: any = { st: { reservationSlots: { guestName: 'Juan', roomType: 'double', checkIn: '2025-10-01', checkOut: '2025-10-05', numGuests: '2' } } };
        const nextSlots: any = { guestName: 'Maria', roomType: 'single', checkIn: '2025-11-01', checkOut: '2025-11-03', numGuests: '3' };
        const r = getCurrentReservation(pre, nextSlots);
        expect(r).toEqual({ guestName: 'Juan', roomType: 'double', checkIn: '2025-10-01', checkOut: '2025-10-05', numGuests: '2' });
    });
    it('getCurrentReservation usa nextSlots cuando falta en estado', () => {
        const pre: any = { st: { reservationSlots: { guestName: 'Ana' } } };
        const nextSlots: any = { roomType: 'suite', checkIn: '2025-12-01', checkOut: '2025-12-10', numGuests: '4' };
        const r = getCurrentReservation(pre, nextSlots);
        expect(r).toEqual({ guestName: 'Ana', roomType: 'suite', checkIn: '2025-12-01', checkOut: '2025-12-10', numGuests: '4' });
    });
    it('buildReservationCopySummary incluye reservationId y locale si existen', () => {
        const pre: any = { st: { reservationSlots: { guestName: 'Luis' }, lastReservation: { reservationId: 'ABC123' } }, lang: 'es' };
        const nextSlots: any = { roomType: 'single' };
        const s = buildReservationCopySummary(pre, nextSlots as any);
        expect(s).toMatchObject({ guestName: 'Luis', roomType: 'single', reservationId: 'ABC123', locale: 'es' });
    });
});

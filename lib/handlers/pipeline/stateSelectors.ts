// Path: lib/handlers/pipeline/stateSelectors.ts
// Helpers centralizados para extraer estado de reserva desde preLLM/bodyLLM

import type { ReservationSlotsStrict } from "../messageHandler"; // circular? solo tipos; si genera problema, replicar la interfaz mínima

export interface PreLike {
    st?: any;
    lang?: string;
    lcHistory?: any[];
}

export function getCurrentReservation(pre: PreLike, nextSlots: ReservationSlotsStrict) {
    const rs = pre.st?.reservationSlots || {};
    return {
        guestName: rs.guestName || nextSlots.guestName,
        roomType: rs.roomType || nextSlots.roomType,
        checkIn: rs.checkIn || nextSlots.checkIn,
        checkOut: rs.checkOut || nextSlots.checkOut,
        numGuests: rs.numGuests || nextSlots.numGuests,
    };
}

export function buildReservationCopySummary(pre: PreLike, nextSlots: ReservationSlotsStrict) {
    const base = getCurrentReservation(pre, nextSlots);
    const fmt = (iso?: string) => {
        if (!iso) return iso;
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
    };
    const summary: any = {
        ...base,
        reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
        locale: pre.lang,
    };
    // Nuevos campos display formateados dd/mm/yyyy (no rompen tests existentes que solo verifican subset)
    if (summary.checkIn) summary.displayCheckIn = fmt(summary.checkIn);
    if (summary.checkOut) summary.displayCheckOut = fmt(summary.checkOut);
    return summary;
}

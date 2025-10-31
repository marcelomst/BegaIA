// Centraliza el formateo del snapshot de reserva (confirmada o en progreso)
// Path: lib/format/reservationSnapshot.ts

export interface ReservationSlotsLike {
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: string | number;
}

export function formatReservationSnapshot(opts: {
    slots: ReservationSlotsLike;
    code?: string | null;
    lang: string; // "es" | "en" | "pt" (acepta otros pero fallback en inglés)
    confirmed: boolean;
    addConfirmHint?: boolean; // añade hint de CONFIRMAR si está completo pero no confirmado
}): string {
    const { slots, code, confirmed } = opts;
    const lang2 = (opts.lang || 'es').slice(0, 2) as 'es' | 'en' | 'pt';
    const g = slots.guestName || '-';
    const r = slots.roomType || '-';
    const toDDMMYYYY = (d?: string) => {
        if (!d) return '-';
        // soporta ISO con o sin tiempo
        const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
        return d; // fallback sin alterar
    };
    const ci = slots.checkIn ? toDDMMYYYY(slots.checkIn) : '-';
    const co = slots.checkOut ? toDDMMYYYY(slots.checkOut) : '-';
    const ng = (slots.numGuests ?? '-') + '';

    if (confirmed) {
        if (lang2 === 'es') return `reserva confirmada:\n\n- nombre: ${g}\n- habitación: ${r}\n- fechas: ${ci} → ${co}\n- huéspedes: ${ng}\n- código: ${code || '-'}`;
        if (lang2 === 'pt') return `reserva confirmada:\n\n- nome: ${g}\n- quarto: ${r}\n- datas: ${ci} → ${co}\n- hóspedes: ${ng}\n- código: ${code || '-'}`;
        return `booking confirmed:\n\n- name: ${g}\n- room: ${r}\n- dates: ${ci} → ${co}\n- guests: ${ng}\n- code: ${code || '-'}`;
    }
    // En progreso
    const hasCore = !!(slots.roomType && slots.checkIn && slots.checkOut);
    const confirmHint = opts.addConfirmHint && hasCore ? (lang2 === 'es'
        ? '\n\nPara confirmar, respondé “CONFIRMAR”.'
        : lang2 === 'pt'
            ? '\n\nPara confirmar, responda “CONFIRMAR”.'
            : '\n\nTo confirm, reply “CONFIRMAR”.') : '';
    if (lang2 === 'es') return `Tu solicitud de reserva está en curso (aún no confirmada).\n\n- Nombre: ${g}\n- Habitación: ${r}\n- Fechas: ${ci} → ${co}\n- Huéspedes: ${ng}` + confirmHint;
    if (lang2 === 'pt') return `Sua solicitação de reserva está em andamento (ainda não confirmada).\n\n- Nome: ${g}\n- Quarto: ${r}\n- Datas: ${ci} → ${co}\n- Hóspedes: ${ng}` + confirmHint;
    return `Your booking request is in progress (not confirmed yet).\n\n- Name: ${g}\n- Room: ${r}\n- Dates: ${ci} → ${co}\n- Guests: ${ng}` + confirmHint;
}

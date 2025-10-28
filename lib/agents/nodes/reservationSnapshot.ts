// Path: lib/agents/nodes/reservationSnapshot.ts
import { AIMessage } from "@langchain/core/messages";
import type { GraphState } from "../graphState";

/**
 * Nodo: reservation_snapshot
 * Muestra el estado actual de la reserva (draft, confirmada, etc.)
 */
export async function handleReservationSnapshotNode(state: typeof GraphState.State & {
    lastReservation?: {
        reservationId?: string;
        status?: string;
        createdAt?: string;
        channel?: string;
    };
    salesStage?: string;
    reservationSlots?: {
        guestName?: string;
        roomType?: string;
        checkIn?: string;
        checkOut?: string;
        numGuests?: number | string;
        locale?: string;
        lastReservation?: {
            reservationId?: string;
            status?: string;
            createdAt?: string;
            channel?: string;
        };
    };
}) {
    // TEMP DEBUG: log hasDraft y datos relevantes
    // eslint-disable-next-line no-console
    // TEMP DEBUG: log el estado y los slots
    // eslint-disable-next-line no-console
    console.log('[reservationSnapshot] state:', JSON.stringify(state));
    const { hotelId, conversationId, detectedLanguage } = state;
    const lang = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
    let summary = "";
    const slots: {
        guestName?: string;
        roomType?: string;
        checkIn?: string;
        checkOut?: string;
        numGuests?: number | string;
    } = state.reservationSlots || {};
    const hasAnySlot = Boolean(
        slots.guestName || slots.roomType || slots.checkIn || slots.checkOut || slots.numGuests
    );
    const hasDraft = (state.salesStage === "quote" || state.salesStage === "qualify") &&
        hasAnySlot &&
        (!state.lastReservation || !state.lastReservation.reservationId);
    // LOG TEMPORAL PARA DEPURAR
    console.log('[reservationSnapshot] hasDraft:', hasDraft, {
        salesStage: state.salesStage,
        slots,
        lastReservation: state.lastReservation
    });
    if (hasDraft) {
        summary = lang === "es"
            ? `Reserva en curso (no confirmada).\n- Nombre: ${slots.guestName}\n- Habitación: ${slots.roomType}\n- Fechas: ${slots.checkIn} → ${slots.checkOut}\n- Huéspedes: ${slots.numGuests}`
            : lang === "pt"
                ? `Reserva em andamento (não confirmada).\n- Nome: ${slots.guestName}\n- Quarto: ${slots.roomType}\n- Datas: ${slots.checkIn} → ${slots.checkOut}\n- Hóspedes: ${slots.numGuests}`
                : `Booking in progress (not confirmed).\n- Name: ${slots.guestName}\n- Room: ${slots.roomType}\n- Dates: ${slots.checkIn} → ${slots.checkOut}\n- Guests: ${slots.numGuests}`;
    } else if (
        (state.lastReservation && state.lastReservation.reservationId) ||
        (state.reservationSlots && state.reservationSlots.lastReservation && state.reservationSlots.lastReservation.reservationId)
    ) {
        // Priorizar el root, pero fallback a reservationSlots si existe
        const lastRes = state.lastReservation?.reservationId ? state.lastReservation : state.reservationSlots?.lastReservation;
        summary = lang === "es"
            ? `Reserva confirmada. Código: ${lastRes.reservationId}\n- Nombre: ${slots.guestName}\n- Habitación: ${slots.roomType}\n- Fechas: ${slots.checkIn} → ${slots.checkOut}\n- Huéspedes: ${slots.numGuests}`
            : lang === "pt"
                ? `Reserva confirmada. Código: ${lastRes.reservationId}\n- Nome: ${slots.guestName}\n- Quarto: ${slots.roomType}\n- Datas: ${slots.checkIn} → ${slots.checkOut}\n- Hóspedes: ${slots.numGuests}`
                : `Booking confirmed. Code: ${lastRes.reservationId}\n- Name: ${slots.guestName}\n- Room: ${slots.roomType}\n- Dates: ${slots.checkIn} → ${slots.checkOut}\n- Guests: ${slots.numGuests}`;
    } else {
        summary = lang === "es" ? "No hay datos de reserva en curso." : lang === "pt" ? "Não há dados de reserva em andamento." : "No booking data in progress.";
    }
    return { messages: [new AIMessage(summary)], category: "reservation_snapshot" };
}

// Path: lib/agents/nodes/reservationConfirm.ts
import { AIMessage } from "@langchain/core/messages";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { confirmAndCreate } from "@/lib/agents/reservations";
import { firstNameOf } from "@/lib/agents/helpers";
import type { GraphState } from "../graphState";

/**
 * Nodo: reservation_confirm
 * Confirma la reserva, persiste lastReservation y responde con agradecimiento personalizado.
 */
export async function handleReservationConfirmNode(state: typeof GraphState.State) {
    const { hotelId, conversationId, detectedLanguage } = state;
    const lang = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
    const st = await getConvState(hotelId, conversationId || "");
    if (!st || !st.reservationSlots || !st.reservationSlots.guestName || !st.reservationSlots.roomType || !st.reservationSlots.checkIn || !st.reservationSlots.checkOut || !st.reservationSlots.locale) {
        return { messages: [new AIMessage(lang === "es" ? "No hay datos de reserva para confirmar." : lang === "pt" ? "Não há dados de reserva para confirmar." : "No booking data to confirm.")], category: "reservation_confirm" };
    }
    // Tipado estricto para confirmAndCreate
    const slots = {
        guestName: String(st.reservationSlots.guestName),
        roomType: String(st.reservationSlots.roomType),
        checkIn: String(st.reservationSlots.checkIn),
        checkOut: String(st.reservationSlots.checkOut),
        locale: String(st.reservationSlots.locale),
        numGuests: typeof st.reservationSlots.numGuests === "number" ? st.reservationSlots.numGuests : parseInt(String(st.reservationSlots.numGuests), 10),
    };
    const result = await confirmAndCreate(hotelId, slots);
    if (!result || !result.ok || !result.reservationId) {
        return { messages: [new AIMessage(lang === "es" ? "Error técnico al confirmar la reserva." : lang === "pt" ? "Erro técnico ao confirmar a reserva." : "Technical error confirming booking.")], category: "reservation_confirm" };
    }
    // Persistir lastReservation y salesStage
    await upsertConvState(hotelId, conversationId || "", {
        ...st,
        lastReservation: {
            reservationId: result.reservationId,
            status: "created",
            createdAt: new Date().toISOString(),
            channel: "web",
        },
        salesStage: "close",
        updatedBy: "ai",
    });
    // Mensaje de confirmación alineado con los tests
    const firstName = firstNameOf(st.reservationSlots.guestName);
    let thankMsg = "";
    if (lang === "es") {
        thankMsg = `¡Gracias, ${firstName}!\nReserva confirmada. Código: ${result.reservationId}`;
    } else if (lang === "pt") {
        thankMsg = `Obrigado, ${firstName}!\nReserva confirmada. Código: ${result.reservationId}`;
    } else {
        thankMsg = `Thank you, ${firstName}!\nBooking confirmed. Code: ${result.reservationId}`;
    }
    return { messages: [new AIMessage(thankMsg)], category: "reservation_confirm" };
}

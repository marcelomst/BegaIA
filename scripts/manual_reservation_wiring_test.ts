
import { handleReservationNode } from "../lib/agents/nodes/reservation";
import { debugLog } from "../lib/utils/debugLog";

async function main() {
    const hotelId = "hotel999";
    const conversationId = "manual-test-1";
    const lang = "es";
    let slots: any = {};
    let meta: any = {};

    // 1) Nombre
    let state = { hotelId, conversationId, normalizedMessage: "Marcelo Martinez", detectedLanguage: lang, reservationSlots: slots, meta };
    let res = await handleReservationNode(state);
    debugLog("[FLOW] Turno 1 Nombre", res);
    slots = { ...slots, guestName: "Marcelo Martinez" };

    // 2) Tipo de habitación
    state = { hotelId, conversationId, normalizedMessage: "doble", detectedLanguage: lang, reservationSlots: slots, meta };
    res = await handleReservationNode(state);
    debugLog("[FLOW] Turno 2 Tipo de habitación", res);
    slots = { ...slots, roomType: "doble" };

    // 3) Fecha de check-in
    state = { hotelId, conversationId, normalizedMessage: "02/10/2025", detectedLanguage: lang, reservationSlots: slots, meta };
    res = await handleReservationNode(state);
    debugLog("[FLOW] Turno 3 Check-in", res);
    slots = { ...slots, checkIn: "2025-10-02" };

    // 4) Fecha de check-out
    state = { hotelId, conversationId, normalizedMessage: "04/10/2025", detectedLanguage: lang, reservationSlots: slots, meta };
    res = await handleReservationNode(state);
    debugLog("[FLOW] Turno 4 Check-out", res);
    slots = { ...slots, checkOut: "2025-10-04" };

    // 5) Cantidad de huéspedes
    state = { hotelId, conversationId, normalizedMessage: "2", detectedLanguage: lang, reservationSlots: slots, meta };
    res = await handleReservationNode(state);
    debugLog("[FLOW] Turno 5 Huéspedes", res);
    slots = { ...slots, numGuests: 2 };

    // 6) Confirmar
    state = { hotelId, conversationId, normalizedMessage: "CONFIRMAR", detectedLanguage: lang, reservationSlots: slots, meta };
    res = await handleReservationNode(state);
    debugLog("[FLOW] Turno 6 Confirmar", res);
}

main().catch(console.error);

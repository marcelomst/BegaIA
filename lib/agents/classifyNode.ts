import type { IntentCategory, DesiredAction } from "@/types/audit";
import { heuristicClassify, looksRoomInfo } from "./helpers";
import { classifyQuery } from "@/lib/classifier";

function isConfirmIntentLight(s: string) {
    const t = (s || "").toLowerCase().trim();
    return /\b(confirmar|confirmo|confirm|sí|si|ok|dale|de acuerdo|yes|okay|okey)\b/.test(t);
}
function isGreeting(s: string) {
    const t = (s || "").trim().toLowerCase();
    return /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi)$/.test(t);
}

export async function classifyNode(state: any) {
    const { normalizedMessage, reservationSlots, meta } = state;
    if (isConfirmIntentLight(normalizedMessage)) {
        return { category: "reservation", desiredAction: "create", intentConfidence: 0.99, intentSource: "heuristic", promptKey: "reservation_flow", messages: [] };
    }
    const prev = meta?.prevCategory || state.category;
    if (isGreeting(normalizedMessage)) {
        return { category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.95, intentSource: "heuristic", promptKey: looksRoomInfo(normalizedMessage) ? "room_info" : "ambiguity_policy", messages: [] };
    }
    const hasAnySlot = ["guestName", "roomType", "checkIn", "checkOut", "numGuests"].some(k => !!reservationSlots?.[k]);
    if (prev === "reservation" || hasAnySlot) {
        const t = (normalizedMessage || "").toLowerCase();
        const isHardSwitch =
            /\b(cancel|cancelar|anular)\b/.test(t) ||
            /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio)\b/.test(t) ||
            /\b(factura|invoice|cobro|billing)\b/.test(t) ||
            /\b(soporte|ayuda|problema|support)\b/.test(t);
        if (!isHardSwitch) {
            return { category: "reservation", desiredAction: "modify", intentConfidence: 0.95, intentSource: "heuristic", promptKey: "reservation_flow", messages: [] };
        }
    }
    let h = heuristicClassify(normalizedMessage);
    if (h.intentConfidence < 0.75) {
        try {
            const llmC = await classifyQuery(normalizedMessage, state.hotelId);
            h = { category: llmC.category as IntentCategory, desiredAction: h.desiredAction, intentConfidence: Math.max(h.intentConfidence, 0.9), intentSource: "llm" };
            const forcedPK = llmC.promptKey ?? (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
            if (forcedPK) return { category: "retrieval_based", desiredAction: h.desiredAction, intentConfidence: h.intentConfidence, intentSource: "llm", promptKey: forcedPK, messages: [] };
        } catch { }
    }
    const pickPK = (cat: IntentCategory, desired: DesiredAction) =>
        cat === "reservation" ? (desired === "modify" ? "modify_reservation" : "reservation_flow")
            : cat === "cancel_reservation" ? "modify_reservation"
                : looksRoomInfo(normalizedMessage) ? "room_info" : "ambiguity_policy";
    const promptKey = pickPK(h.category, h.desiredAction);
    return { category: h.category, desiredAction: h.desiredAction, intentConfidence: h.intentConfidence, intentSource: h.intentSource, promptKey, messages: [] };
}

import type { IntentCategory, DesiredAction } from "@/types/audit";
import { heuristicClassify, looksRoomInfo, pickNearbyPromptKey } from "./helpers";
import { classifyQuery } from "@/lib/classifier";
import { debugLog } from "@/lib/utils/debugLog";

function isConfirmIntentLight(s: string) {
    const t = (s || "").toLowerCase().trim();
    return /\b(confirmar|confirmo|confirm|sí|si|ok|dale|de acuerdo|yes|okay|okey)\b/.test(t);
}
function isGreeting(s: string) {
    const t = (s || "").trim().toLowerCase();
    return /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi)$/.test(t);
}
function hasReservationAvailabilitySignal(s: string) {
    const t = (s || "").toLowerCase();
    return /\b(reserv\w*|booking|book|disponibil\w*|availability|habitaci[oó]n|room|quarto|check[ -]?in|check[ -]?out|hu[eé]sped(?:es)?|guest(?:s)?|adulto(?:s)?|adult)\b/.test(t);
}
function wantsEvents(s: string) {
    const t = (s || "").toLowerCase();
    if (hasReservationAvailabilitySignal(t)) return false;
    const keys = [
        // ES
        "evento", "eventos", "agenda", "que hay", "que hacer", "hoy", "mañana", "manana",
        "esta noche", "fin de semana", "este fin de semana", "este mes", "mes", "mensual",
        "evento turistico", "evento turístico", "eventos turisticos", "eventos turísticos",
        // EN
        "event", "events", "tourist event", "tourist events", "today", "tomorrow", "tonight",
        "weekend", "this weekend", "this month", "month", "monthly",
        // PT
        "evento", "eventos", "agenda", "hoje", "amanhã", "amanha", "esta noite",
        "fim de semana", "este fim de semana", "este mês", "este mes", "mês", "mes", "mensal",
        "evento turistico", "eventos turisticos",
    ];
    return keys.some((k) => t.includes(k));
}
function wantsImages(s: string) {
    const t = (s || "").toLowerCase();
    return /\b(imagenes|imágenes|fotos|con\s+imagenes|con\s+imágenes|con\s+fotos|images|photos|pictures|pics|with\s+images|with\s+photos|with\s+pictures|with\s+pics|imagens|com\s+imagens|com\s+fotos)\b/.test(t);
}

export async function classifyNode(state: any) {
    const { normalizedMessage, reservationSlots, meta } = state;
    const withLog = (result: any) => {
        debugLog("[classifyNode]", {
            text: normalizedMessage,
            category: result?.category,
            promptKey: result?.promptKey,
            desiredAction: result?.desiredAction,
            intentSource: result?.intentSource,
        });
        return result;
    };
    if (wantsEvents(normalizedMessage)) {
        const pk = wantsImages(normalizedMessage) ? "tourist_events_img" : "tourist_events";
        return withLog({ category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.96, intentSource: "heuristic", promptKey: pk, messages: [] });
    }
    let nearbyPK = pickNearbyPromptKey(normalizedMessage);
    if (nearbyPK === "nearby_points" && meta?.channel === "web") {
        nearbyPK = "nearby_points_img";
    }
    if (nearbyPK) {
        return withLog({ category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.96, intentSource: "heuristic", promptKey: nearbyPK, messages: [] });
    }
    if (isConfirmIntentLight(normalizedMessage)) {
        return withLog({ category: "reservation", desiredAction: "create", intentConfidence: 0.99, intentSource: "heuristic", promptKey: "reservation_flow", messages: [] });
    }
    const prev = meta?.prevCategory || state.category;
    if (isGreeting(normalizedMessage)) {
        return withLog({ category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.95, intentSource: "heuristic", promptKey: looksRoomInfo(normalizedMessage) ? "room_info" : "ambiguity_policy", messages: [] });
    }
    const hasAnySlot = ["guestName", "roomType", "checkIn", "checkOut", "numGuests"].some(k => !!reservationSlots?.[k]);
    if (prev === "reservation" || hasAnySlot) {
        const t = (normalizedMessage || "").toLowerCase();
        const isHardSwitch =
            /\b(cancel|cancelar|anular)\b/.test(t) ||
            /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio)\b/.test(t) ||
            /\b(factura|invoice|cobro|billing|btc|bitcoin|crypto)\b/.test(t) ||
            /\b(soporte|ayuda|problema|support)\b/.test(t);
        if (!isHardSwitch) {
            return withLog({ category: "reservation", desiredAction: "modify", intentConfidence: 0.95, intentSource: "heuristic", promptKey: "reservation_flow", messages: [] });
        }
    }
    let h = heuristicClassify(normalizedMessage);
    if (h.intentConfidence < 0.75) {
        try {
            const llmC = await classifyQuery(normalizedMessage, state.hotelId);
            h = { category: llmC.category as IntentCategory, desiredAction: h.desiredAction, intentConfidence: Math.max(h.intentConfidence, 0.9), intentSource: "llm" };
            const forcedPK = llmC.promptKey ?? (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
            if (forcedPK) return withLog({ category: "retrieval_based", desiredAction: h.desiredAction, intentConfidence: h.intentConfidence, intentSource: "llm", promptKey: forcedPK, messages: [] });
        } catch { }
    }
    const pickPK = (cat: IntentCategory, desired: DesiredAction) =>
        cat === "reservation" ? (desired === "modify" ? "modify_reservation" : "reservation_flow")
            : cat === "cancel_reservation" ? "modify_reservation"
                : looksRoomInfo(normalizedMessage) ? "room_info" : "ambiguity_policy";
    const promptKey = pickPK(h.category, h.desiredAction);
    return withLog({ category: h.category, desiredAction: h.desiredAction, intentConfidence: h.intentConfidence, intentSource: h.intentSource, promptKey, messages: [] });
}

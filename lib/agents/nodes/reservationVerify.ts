// Path: lib/agents/nodes/reservationVerify.ts
import { AIMessage } from "@langchain/core/messages";
import type { GraphState } from "../graphState";

export async function handleReservationVerifyNode(state: typeof GraphState.State) {
    const lang = (state.detectedLanguage || "es").slice(0, 2);
    let msg = "";
    if (lang === "es") {
        msg =
            "Puedo corroborar tu reserva. ¿Me compartís el CÓDIGO de reserva? Si no lo tenés a mano, decime nombre completo y fechas aproximadas (check-in/check-out) para buscarla.";
    } else if (lang === "pt") {
        msg =
            "Posso verificar sua reserva. Você pode me informar o CÓDIGO da reserva? Se não tiver, diga o nome completo e as datas aproximadas (check-in/check-out) para eu localizar.";
    } else {
        msg =
            "I can check your booking. Please share the booking CODE. If you don't have it, tell me the full name and approximate dates (check-in/check-out) to look it up.";
    }
    return {
        messages: [new AIMessage(msg)],
        category: "reservation_verify",
        desiredAction: undefined,
    };
}

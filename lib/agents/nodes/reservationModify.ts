import { AIMessage } from "@langchain/core/messages";
import { formatReservationSnapshot } from "@/lib/format/reservationSnapshot";
import type { GraphState } from "../graphState";
import { debugLog } from "@/lib/utils/debugLog";

export async function askModifyFieldNode(state: typeof GraphState.State) {
    const lang = (state.detectedLanguage || "es").slice(0, 2);
    let msg = "";
    if (lang === "es") {
        msg = "¿Qué dato de la reserva deseas modificar? (fechas, nombre, habitación, huéspedes, etc.)";
    } else if (lang === "pt") {
        msg = "Qual informação da reserva você deseja alterar? (datas, nome, quarto, hóspedes, etc.)";
    } else {
        msg = "What detail of the booking would you like to modify? (dates, name, room, guests, etc.)";
    }
    const result = {
        messages: [new AIMessage(msg)],
        category: "modify_reservation_field",
        desiredAction: "modify",
    };
    debugLog('[Graph] Exit askModifyFieldNode', { result });
    return result;
}

export async function askNewValueNode(state: typeof GraphState.State) {
    debugLog('[Graph] Enter askNewValueNode', { state });
    const lang = (state.detectedLanguage || "es").slice(0, 2);
    const field = state.meta?.modField || "dato";
    let msg = "";
    if (lang === "es") {
        msg = `Por favor, dime el nuevo valor para ${field}.`;
    } else if (lang === "pt") {
        msg = `Por favor, informe o novo valor para ${field}.`;
    } else {
        msg = `Please provide the new value for ${field}.`;
    }
    const result = {
        messages: [new AIMessage(msg)],
        category: "modify_reservation_value",
        desiredAction: "modify",
    };
    debugLog('[Graph] Exit askNewValueNode', { result });
    return result;
}

export async function confirmModificationNode(state: typeof GraphState.State) {
    debugLog('[Graph] Enter confirmModificationNode', { state });
    const lang = (state.detectedLanguage || "es").slice(0, 2);
    const slots = state.reservationSlots || {};

    const base = formatReservationSnapshot({
        slots,
        code: (state as any)?.lastReservation?.reservationId,
        lang,
        confirmed: !!(state as any)?.lastReservation?.reservationId,
        addConfirmHint: false,
    });

    let msg = base;
    if (lang === "es") {
        msg += "\n¿Quieres modificar otro dato o finalizar?";
    } else if (lang === "pt") {
        msg += "\nDeseja alterar outro dado ou finalizar?";
    } else {
        msg += "\nWould you like to modify another detail or finish?";
    }

    const result = {
        messages: [new AIMessage(msg)],
        category: "modify_reservation_confirm",
        desiredAction: "modify",
    };
    debugLog('[Graph] Exit confirmModificationNode', { result });
    return result;
}

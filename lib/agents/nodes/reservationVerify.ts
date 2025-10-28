// Path: lib/agents/nodes/reservationVerify.ts
import { AIMessage } from "@langchain/core/messages";
import type { GraphState } from "../graphState";

/**
 * Nodo: reservation_verify
 * Pide el código de reserva y muestra confirmación si existe.
 */
export async function handleReservationVerifyNode(state: typeof GraphState.State) {
    const { detectedLanguage } = state;
    const lang = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
    // En un flujo real, aquí se consultaría la DB por el código
    // Para demo, solo pide el código
    const askCode = lang === "es"
        ? "¿Podés indicarme el código de reserva para verificar el estado?"
        : lang === "pt"
            ? "Pode informar o código da reserva para verificar o status?"
            : "Could you provide the booking code to verify the status?";
    return { messages: [new AIMessage(askCode)], category: "reservation_verify" };
}

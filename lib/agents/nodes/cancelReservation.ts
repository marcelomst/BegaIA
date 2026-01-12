// Path: /root/begasist/lib/agents/nodes/cancelReservation.ts

import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { searchFromAstra } from "@/lib/retrieval";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { curatedPrompts, defaultPrompt } from "@/lib/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { GraphState } from "../graphState";

export async function handleCancelReservationNode(state: typeof GraphState.State) {
    const originalLang = state.detectedLanguage ?? "es";
    const hotelLang = await getHotelNativeLanguage(state.hotelId);
    const norm = (v: string) => (v || "").slice(0, 2).toLowerCase();
    const orig2 = norm(originalLang) as "es" | "en" | "pt" | string;
    const hotel2 = norm(hotelLang) as "es" | "en" | "pt" | string;
    const retrievalLang: "es" | "en" | "pt" = (["es", "en", "pt"] as const).includes(orig2 as any)
        ? (orig2 as any)
        : ((["es", "en", "pt"].includes(hotel2) ? (hotel2 as any) : "es"));
    const userQuery = state.normalizedMessage || "";
    const hotelId = state.hotelId || "hotel999";
    // Usar la categoría del grafo 'cancel_reservation' para recuperar políticas/detalles
    const filters = {
        category: "cancel_reservation",
        promptKey: state.promptKey ?? undefined,
    } as const;
    debugLog("[cancel_reservation] langs", {
        lang_in: originalLang,
        lang_retrieval: retrievalLang,
        lang_out: originalLang,
    });
    let text = "";
    try {
        const docs = await searchFromAstra(userQuery, hotelId, filters, retrievalLang);
        const retrieved = (docs || []).join("\n\n");
        if (!retrieved) {
            // Fallback a playbooks del sistema si no hay RAG
            const lang = (originalLang || "es").slice(0, 2);
            const map = await getSystemPlaybooks(["ambiguity_policy"], lang);
            const sys = [
                "Eres un recepcionista de hotel. Política: nunca cancela sin confirmación explícita del huésped.",
                map["ambiguity_policy"]?.text ? `\n[ambiguity_policy]\n${map["ambiguity_policy"].text}\n` : "",
                `Responde en ${lang}, breve y amable.`,
            ].join("\n");
            const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
                new SystemMessage(sys),
                new HumanMessage(`Usuario: \"\"\"${userQuery}\"\"\"`),
            ]);
            text = typeof out.content === "string" ? out.content.trim() : `${out.content}`;
        } else {
            const key = state.promptKey ?? undefined;
            const prompt = (key && curatedPrompts[key]) || defaultPrompt;
            const finalPrompt = prompt
                .replace("{{retrieved}}", retrieved)
                .replace("{{query}}", userQuery);
            const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
                new SystemMessage(finalPrompt),
                new HumanMessage(userQuery),
            ]);
            text = typeof out.content === "string" ? out.content.trim() : `${out.content}`;
        }
    } catch (e) {
        console.warn("[cancel_reservation] RAG error:", (e as any)?.message || e);
        text =
            orig2 === "pt"
                ? "Posso ajudar com o cancelamento. Preciso do código da reserva, nome completo e datas. Confirma?"
                : orig2 === "en"
                    ? "I can help with cancellation. I need your booking code, full name, and dates. Can you confirm?"
                    : "Puedo ayudarte con la cancelación. Necesito el código de reserva, nombre completo y fechas. ¿Me confirmás?";
    }
    const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
    return {
        messages: [new AIMessage(responseToUser || text)],
        category: "cancel_reservation",
    };
}

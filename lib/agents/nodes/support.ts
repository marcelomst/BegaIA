import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { searchFromAstra } from "@/lib/retrieval";
import { curatedPrompts, defaultPrompt } from "@/lib/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import type { GraphState } from "../graphState";

export async function handleSupportNode(state: typeof GraphState.State) {
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
    const filters = {
        category: "support",
        promptKey: state.promptKey ?? undefined,
    } as const;
    debugLog("[support] langs", {
        lang_in: originalLang,
        lang_retrieval: retrievalLang,
        lang_out: originalLang,
    });
    let text = "";
    try {
        const docs = await searchFromAstra(userQuery, hotelId, filters, retrievalLang);
        const retrieved = (docs || []).join("\n\n");
        if (!retrieved) {
            text =
                orig2 === "pt"
                    ? "Estou aqui para ajudar. Pode descrever brevemente o problema?"
                    : orig2 === "en"
                        ? "I’m here to help. Could you briefly describe the issue?"
                        : "Estoy para ayudarte. ¿Podés contarme brevemente el problema?";
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
        console.warn("[support] RAG error:", (e as any)?.message || e);
        text =
            orig2 === "pt"
                ? "Descreva o problema e eu ajudo."
                : orig2 === "en"
                    ? "Describe the issue and I’ll help."
                    : "Contame el problema y te ayudo.";
    }
    const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
    return {
        messages: [new AIMessage(responseToUser || text)],
        category: "support",
    };
}

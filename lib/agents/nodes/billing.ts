// Path: /root/begasist/lib/agents/nodes/billing.ts
import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { searchFromAstra } from "@/lib/retrieval";
import { curatedPrompts, defaultPrompt } from "@/lib/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import type { GraphState } from "../graphState";

export async function handleBillingNode(state: typeof GraphState.State) {
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
        category: "billing",
        promptKey: state.promptKey ?? undefined,
    } as const;
    debugLog("[billing] langs", {
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
                    ? "Posso ajudar com faturamento. É sobre uma reserva existente ou futura?"
                    : orig2 === "en"
                        ? "Happy to help with billing. Is it about an existing or a future booking?"
                        : "Con gusto. ¿Tu consulta de facturación es por una reserva existente o por una futura?";
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
        console.warn("[billing] RAG error:", (e as any)?.message || e);
        text =
            orig2 === "pt"
                ? "Me diga sua dúvida de faturamento e eu ajudo."
                : orig2 === "en"
                    ? "Tell me your billing question and I’ll help."
                    : "Contame tu duda de facturación y te ayudo.";
    }
    const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
    return {
        messages: [new AIMessage(responseToUser || text)],
        category: "billing",
    };
    // ...existing code...
}

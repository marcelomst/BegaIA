// Path: /root/begasist/lib/agents/nodes/amenities.ts

import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { searchFromAstra } from "@/lib/retrieval";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { curatedPrompts, defaultPrompt } from "@/lib/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import type { GraphState as GS } from "../graph";

export async function handleAmenitiesNode(state: typeof GS.State) {
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
        category: "amenities",
        promptKey: state.promptKey ?? undefined,
    } as const;
    debugLog("[amenities] langs", {
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
                    ? "Claro! Diga qual serviço você precisa (piscina, café da manhã, estacionamento, etc.) e eu compartilho os detalhes."
                    : orig2 === "en"
                        ? "Sure! Tell me which amenity you need (pool, breakfast, parking, etc.) and I’ll share the details."
                        : "¡Claro! Contame qué servicio querés consultar (piscina, desayuno, cocheras, etc.) y te paso la info.";
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
        console.warn("[amenities] RAG error:", (e as any)?.message || e);
        text =
            orig2 === "pt"
                ? "Conte-me qual amenidade precisa e eu ajudo."
                : orig2 === "en"
                    ? "Tell me the amenity you need and I’ll help."
                    : "Decime qué servicio querés consultar y te ayudo.";
    }
    const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
    return {
        messages: [new AIMessage(responseToUser || text)],
        category: "amenities",
    };
}

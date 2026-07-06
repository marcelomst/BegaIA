// Path: /root/begasist/lib/agents/knowledgeBaseAgent.ts
// Minimal KnowledgeBaseAgent: classify → resolve → retrieve → answer

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { classifyQuery } from "@/lib/classifier";
import { resolveCategoryForHotel } from "@/lib/categories/resolveCategory";
import { searchFromAstra } from "@/lib/retrieval";
import { curatedPrompts, defaultPrompt, promptMetadata } from "@/lib/prompts";
import { DefaultKnowledgeBaseHydrator } from "@/lib/kb/knowledgeBaseHydrator";
import type { ChannelType } from "@/types/kb";

export type KnowledgeAnswer = {
    ok: boolean;
    hotelId: string;
    category: string;
    promptKey: string | null;
    lang: string;
    retrieved: string[];
    contentTitle?: string | null;
    contentBody?: string | null;
    answer: string | null;
    debug?: Record<string, any>;
};

const hydrator = new DefaultKnowledgeBaseHydrator();

export async function answerWithKnowledge(args: {
    question: string;
    hotelId: string;
    desiredLang?: string; // es/en/pt preferred; falls back to registry/override
    override?: { category?: string; promptKey?: string };
}): Promise<KnowledgeAnswer> {
    const { question, hotelId, desiredLang, override } = args;

    // 1) Classify question into category/promptKey
    const cls = override?.category && override?.promptKey
        ? { category: override.category, promptKey: override.promptKey }
        : await classifyQuery(question, hotelId);
    const category = override?.category ?? cls.category;
    const promptKey = override?.promptKey ?? cls.promptKey ?? null;

    // 2) Resolve effective routing, retriever and content (hotel/system)
    const resolved = await resolveCategoryForHotel({
        hotelId,
        category,
        promptKey: promptKey || "kb_general",
        desiredLang,
    });

    // Enforce promptKey consistency with metadata and choose a safe template fallback.
    // Priority:
    // 1) explicit valid promptKey
    // 2) resolved router promptKey (if available)
    // 3) kb_general
    // 4) first metadata key for the category (legacy last resort, non-retrieval only)
    const validPK = promptKey && promptMetadata[category]?.includes(promptKey);
    const resolvedPromptKey =
        typeof resolved.router?.promptKey === "string" && resolved.router.promptKey.trim()
            ? resolved.router.promptKey.trim()
            : null;
    const safeFallbackPromptKey = "kb_general";
    const legacyMetadataFallback =
        category === "retrieval_based" ? null : (promptMetadata[category]?.[0] ?? null);
    const finalPromptKey = validPK
        ? promptKey
        : ((resolvedPromptKey || safeFallbackPromptKey)
            || legacyMetadataFallback);

    // 2.b: intentar obtener contenido hidratado de plantillas (machineBody + grafo/PMS)
    let hydratedTemplateText: string | null = null;
    try {
        const hydrated = await hydrator.getHydratedContent({
            hotelId,
            categoryId: category,
            lang: resolved.lang,
            channel: "web" as ChannelType,
        });
        hydratedTemplateText = hydrated.text;
    } catch {
        hydratedTemplateText = null;
    }

    // 3) Retrieve KB chunks from vector store filtered by resolved.retriever
    const topK = Math.max(1, resolved.retriever?.topK ?? 6);
    const filters = {
        category: resolved.router?.category ?? category,
        promptKey: resolved.router?.promptKey ?? (finalPromptKey || "kb_general"),
        targetLang: resolved.lang,
    };
    let retrieved: string[] = [];
    try {
        const results = await searchFromAstra(question, hotelId, filters, resolved.lang);
        retrieved = Array.isArray(results) ? results.slice(0, topK) : [];
    } catch {
        retrieved = [];
    }

    // 4) Compose prompt: combinamos plantilla hidratada + chunks de retrieval
    const promptTemplate = (finalPromptKey && curatedPrompts[finalPromptKey]) || defaultPrompt;

    const contextBlocks: string[] = [];
    if (hydratedTemplateText && hydratedTemplateText.trim().length > 0) {
        contextBlocks.push(hydratedTemplateText);
    }
    if (retrieved && retrieved.length) {
        contextBlocks.push(retrieved.join("\n\n"));
    }

    const combinedContext =
        contextBlocks.length > 0 ? contextBlocks.join("\n\n") : "(sin resultados)";

    const prompt = String(promptTemplate)
        .replace("{{retrieved}}", combinedContext)
        .replace("{{query}}", question);

    // 5) LLM answer
    let answer: string | null = null;
    try {
        const model = new ChatOpenAI({
            modelName: process.env.LLM_KB_MODEL || "gpt-4o-mini",
            temperature: 0.2,
        });
        const scopedSystem =
            category === "amenities"
                ? "Eres un asistente del hotel. Responde claro y profesional usando sólo el contexto disponible. Mantén el foco en amenities/horarios y no agregues recomendaciones de actividades, eventos o paseos."
                : "Eres un asistente del hotel. Responde claro y profesional usando sólo el contexto disponible.";
        const res = await model.invoke([
            new SystemMessage(scopedSystem),
            new HumanMessage(prompt),
        ]);
        answer = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    } catch {
        answer = null;
    }

    // 6) Build response
    return {
        ok: true,
        hotelId,
        category,
        promptKey: finalPromptKey,
        lang: resolved.lang,
        retrieved,
        contentTitle: resolved.content?.title ?? null,
        contentBody: resolved.content?.body ?? null,
        answer,
        debug: {
            classified: cls,
            resolved,
            filters,
            usedPromptTemplate: finalPromptKey || "default",
            usedHydratedTemplate: Boolean(hydratedTemplateText),
        },
    };
}

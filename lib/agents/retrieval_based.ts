// Path: /root/begasist/lib/agents/retrieval_based.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "./index";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { defaultPrompt, curatedPrompts } from "../prompts";
import { debugLog } from "../utils/debugLog";
import { searchFromAstra } from "../retrieval";
import { getHotelNativeLanguage } from "../config/hotelLanguage";
import { translateIfNeeded } from "../i18n/translateIfNeeded";

let localModel: ChatOpenAI | null = null;

// Normaliza a ISO1 soportado (es/en/pt/other)
function normalizeLang(raw?: string | null): "es" | "en" | "pt" | "other" {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("es") || v === "spa" || v === "esp" || v === "sp") return "es";
  if (v.startsWith("en") || v === "eng") return "en";
  if (v.startsWith("pt") || v === "por") return "pt";
  return "other";
}
// Utilidad para extraer el último texto humano
export async function getLastHumanText(msgs: BaseMessage[]): Promise<string> {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m instanceof HumanMessage) {
      const c = (m as HumanMessage).content;
      if (typeof c === "string") return c.trim();
      if (Array.isArray(c)) {
        type TextSegment = { type?: string; text?: string } | string | null | undefined;
        return (c as TextSegment[])
          .map((p) => {
            if (typeof p === "string") return p;
            if (p && typeof p === "object" && (p as { type?: string }).type === "text") {
              return (p as { text?: string }).text ?? "";
            }
            return "";
          })
          .join(" ").trim();
      }
    }
  }
  return "";
}

// Función principal de retrieval determinista
export async function retrievalBased(state: any): Promise<any> {
  let userQuery = state.normalizedMessage;
  if (!userQuery) {
    userQuery = await getLastHumanText(state.messages as BaseMessage[]);
  }
  let promptKey = state.promptKey;
  let category = state.category;
  let retrievedInfo: string = "";
  let finalResponse: string = "";
  let rich: { type: string; data?: any } | undefined = undefined;

  // --- Algoritmo determinista: VistaTotal ---
  const { getHotelAstraCollection } = await import("../astra/connection");
  const collection = getHotelAstraCollection(state.hotelId ?? "hotel999");
  const allDocs = await collection.find({ hotelId: state.hotelId ?? "hotel999" }).toArray();
  // Agrupar por category, promptKey, targetLang
  const groups: Record<string, any[]> = {};
  for (const doc of allDocs) {
    const key = `${doc.category ?? ''}|${doc.promptKey ?? ''}|${doc.targetLang ?? ''}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }
  // Para cada grupo, tomar el chunk con la versión más alta
  const latestIds = Object.values(groups).map((group: any[]) => {
    return group.reduce((max, curr) => {
      if (curr.version && max.version) {
        return curr.version > max.version ? curr : max;
      }
      return curr;
    }, group[0])._id;
  });
  debugLog(`[retrievalBased] latestIds por grupo:`, latestIds);
  const docs = await searchFromAstra(
    userQuery,
    state.hotelId ?? "hotel999",
    {},
    state.retrievalLang,
    { forceVectorSearch: true, allowedIds: latestIds }
  );

  // Inferir categoría y promptKey según chunks recuperados
  if (Array.isArray(docs) && docs.length > 0) {
    const topChunk = docs[0];
    if (topChunk.category) category = topChunk.category;
    if (topChunk.promptKey) promptKey = topChunk.promptKey;
    debugLog(`[retrievalBased] categoría y promptKey inferidos:`, { category, promptKey });
  }

  // Si se forzó vector search, docs ya trae chunks completos
  if (state.forceVectorSearch && Array.isArray(docs) && docs.length > 0 && docs[0].text) {
    retrievedInfo = docs.map((d: any) => d.text).join("\n\n");
    (state as any).vectorChunks = docs;
  } else {
    retrievedInfo = Array.isArray(docs) ? docs.join("\n\n") : String(docs ?? "");
  }

  if (!retrievedInfo) {
    debugLog("⚠️ No se encontró información relevante en los documentos.");
    if (!localModel) throw new Error("localModel is not initialized.");
    const response = await localModel.invoke([
      { role: "user", content: userQuery }
    ]);
    finalResponse = typeof response.content === "string" ? response.content.trim() : "Lo siento, no encontré información.";
  } else {
    const promptTemplate = (promptKey && curatedPrompts[promptKey]) || defaultPrompt;
    const finalPrompt = promptTemplate
      .replace("{{retrieved}}", retrievedInfo)
      .replace("{{query}}", userQuery);

    if (!localModel) throw new Error("localModel is not initialized.");
    const response = await localModel.invoke([
      { role: "system", content: finalPrompt },
      { role: "user", content: userQuery },
    ]);
    finalResponse = typeof response.content === "string" ? response.content.trim() : "";

    // 🆕 Si es un doc "room_info_img", intentar construir payload rico básico
    if (promptKey === "room_info_img") {
      try {
        const items: Array<{ type?: string; icon?: string; highlights?: string[]; images?: string[] }> = [];
        const blocks = retrievedInfo.split(/\n\s*\n+/);
        for (const b of blocks) {
          const type = (b.match(/\bTipo\s*:\s*(.+)/i)?.[1] || "").trim();
          const icon = (b.match(/\bIcono\s*:\s*(.+)/i)?.[1] || "").trim();
          const hiRaw = (b.match(/\bHighlights?\s*:\s*(.+)/i)?.[1] || "").trim();
          const imgRaw = (b.match(/\bImages?\s*:\s*(\[.*\]|.+)/i)?.[1] || "").trim();
          if (!type && !hiRaw && !imgRaw) continue;
          const highlights = hiRaw
            ? hiRaw.split(/[•\-\u2022]|\s*;\s*|\s*\|\s*|\n/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6)
            : undefined;
          let images: string[] | undefined;
          if (imgRaw) {
            try {
              if (imgRaw.startsWith("[")) images = JSON.parse(imgRaw);
              else images = imgRaw.split(/\s*,\s*|\s+|\n/).filter((u: string) => /https?:\/+/i.test(u));
            } catch { images = undefined; }
          }
          items.push({ type: type || undefined, icon: icon || undefined, highlights, images });
        }
        if (items.length) rich = { type: "room-info-img", data: items };
      } catch { /* best-effort */ }
    }
  }

  // Traducir SOLO si retrievalLang difiere del idioma original del usuario
  const responseToUser = await translateIfNeeded(finalResponse, state.retrievalLang, state.originalLang);

  return {
    ...state,
    messages: [...state.messages, new AIMessage(responseToUser || "Lo siento, no encontré información.")],
    category,
    promptKey,
    meta: {
      ...(state as any).meta,
      ...(rich ? { rich } : {}),
    },
  };
}
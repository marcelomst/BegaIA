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
function getLastHumanText(msgs: BaseMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m instanceof HumanMessage) {
      const c = (m as HumanMessage).content;
      if (typeof c === "string") return c.trim();
      // Si usás mensajes “multimodal”, convertí a texto de forma segura:
      if (Array.isArray(c)) {
        return c
          .map((p: any) => (p?.type === "text" ? p.text : ""))
          .join(" ")
          .trim();
      }
      return String(c ?? "").trim();
    }
  }
  return "";
}
export function setRetrievalModel(model: ChatOpenAI) {
  localModel = model;
}

// ✅ Seteo por defecto
setRetrievalModel(new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 }));

process.env.OPENAI_LOG = "off";

export async function retrievalBased(state: typeof GraphState.State) {
  // 1. Idioma original y nativo
  debugLog(`[retrievalBased] hotelId recibido:`, state.hotelId);
  const originalLang = state.detectedLanguage ?? "en";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);

  // 2. Usar siempre el mensaje ya traducido a idioma nativo (del nodo de clasificación)
  const userQuery =
    (state as any).normalizedMessage ??
    getLastHumanText(state.messages as BaseMessage[]);
  const promptKey = state.promptKey;
  const hotelId = state.hotelId ?? "hotel999";

  if (!userQuery) {
    return { messages: [new AIMessage("Consulta vacía o inválida.")] };
  }

  // 3. Retrieval y generación siempre en idioma nativo
  const docs = await searchFromAstra(userQuery, hotelId, {
    category: state.category,
    promptKey: promptKey ?? undefined,
  });
  const retrievedInfo = docs.join("\n\n");

  let finalResponse: string;

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
  }

  // 4. Antes de devolver la respuesta, traducir SOLO si el idioma original del usuario era distinto al nativo del hotel
  const responseToUser = await translateIfNeeded(finalResponse, hotelLang, originalLang);

  return {
    ...state,
    messages: [...state.messages, new AIMessage(responseToUser || "Lo siento, no encontré información.")],
  };
}

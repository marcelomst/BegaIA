import { ChatOpenAI } from "@langchain/openai";
import { GraphState} from "./index";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { defaultPrompt, curatedPrompts } from "../prompts";
import { debugLog } from "../utils/debugLog";
import { searchFromAstra } from "../retrieval";

let localModel: ChatOpenAI | null = null;

export function setRetrievalModel(model: ChatOpenAI) {
  localModel = model;
}

// ✅ Seteo por defecto
setRetrievalModel(new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 }));

process.env.OPENAI_LOG = "off";

const translationModel = new ChatOpenAI({ model: "gpt-4o" });

async function translateResponseBack(originalLang: string, content: string): Promise<string> {
  if (originalLang === process.env.SYSTEM_NATIVE_LANGUAGE) return content;

  const translated = await translationModel.invoke([
    {
      role: "system",
      content: `Traduce el siguiente contenido al idioma '${originalLang}' manteniendo emojis y formato Markdown.`,
    },
    { role: "user", content },
  ]);

  return typeof translated.content === "string" ? translated.content : content;
}

export async function retrieve_hotel_info(
  query: string,
  lang: string,
  hotelId: string,
  category?: string,
  promptKey?: string | null
) {
  const translated = lang === process.env.SYSTEM_NATIVE_LANGUAGE
    ? { content: query }
    : await translationModel.invoke([
        {
          role: "system",
          content: `Solo responde con la traducción literal de la siguiente consulta al idioma '${process.env.SYSTEM_NATIVE_LANGUAGE}'.`,
        },
        { role: "user", content: query },
      ]);

  const searchQuery = typeof translated.content === "string"
    ? translated.content
    : JSON.stringify(translated.content);

  const docs = await searchFromAstra(searchQuery, hotelId, {
    category,
    promptKey: promptKey ?? undefined,
  });

  return docs.join("\n\n");
}

export async function retrievalBased(state: typeof GraphState.State) {
  const lastMessage = state.messages.findLast((m) => m instanceof HumanMessage);
  const userQuery = typeof lastMessage?.content === "string" ? lastMessage.content.trim() : "";
  const lang = state.detectedLanguage ?? process.env.SYSTEM_NATIVE_LANGUAGE;
  const promptKey = state.promptKey;
  const hotelId = (state as any).hotelId ?? "defaultHotelId"; // fallback por si no viene

  if (!userQuery) {
    return { messages: [new AIMessage("Consulta vacía o inválida.")] };
  }

  const retrievedInfo = await retrieve_hotel_info(userQuery, lang, hotelId, state.category, promptKey);

  if (!retrievedInfo) {
    debugLog("⚠️ No se encontró información relevante en los documentos.");
    if (!localModel) {
      throw new Error("localModel is not initialized.");
    }
    const response = await localModel.invoke(state.messages);
    const responseText = typeof response.content === "string" ? response.content.trim() : "";
    return {
      messages: [new AIMessage(responseText || "Lo siento, no encontré información.")],
    };
  }

  const promptTemplate = (promptKey && curatedPrompts[promptKey]) || defaultPrompt;
  const finalPrompt = promptTemplate
    .replace("{{retrieved}}", retrievedInfo)
    .replace("{{query}}", userQuery);

  if (!localModel) {
    throw new Error("localModel is not initialized.");
  }
  const response = await localModel.invoke([
    { role: "system", content: finalPrompt },
    { role: "user", content: userQuery },
  ]);

  const responseText = typeof response.content === "string" ? response.content.trim() : "";
  const finalResponse = lang === process.env.SYSTEM_NATIVE_LANGUAGE
    ? responseText
    : await translateResponseBack(lang, responseText);

  return {
    ...state,
    messages: [...state.messages, new AIMessage(finalResponse || "Lo siento, no encontré información.")],
  };
}

// Path: /root/begasist/lib/classifier/index.ts

import { ChatOpenAI } from "@langchain/openai";
import { promptMetadata } from "../prompts/promptMetadata";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { normalizeCategory } from "./categoryAliases";
import { debugLog } from "../utils/debugLog";

export type Classification = {
  category: string;
  promptKey?: string | null;
};

export async function classifyQuery(question: string, hotelId: string): Promise<Classification> {
  const lang = await getHotelNativeLanguage(hotelId);
  const dict = await getDictionary(lang);

  const allowedCategories = Object.keys(promptMetadata).join(", ");
  const allPromptKeys = Object.entries(promptMetadata)
    .flatMap(([_, keys]) => keys)
    .filter(Boolean);

  // Usá el prompt del diccionario y hacé los replaces dinámicos:
  let prompt = dict.classifierPrompt
    .replace("{{allowedCategories}}", allowedCategories)
    .replace("{{allPromptKeys}}", allPromptKeys.join(", "))
    .replace("{{question}}", question);

  const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 });
  const res = await model.invoke([{ role: "user", content: prompt }]);

  try {
    const parsed = JSON.parse(res.content as string);
    let { category, promptKey } = parsed;
    category = normalizeCategory(category);
    if (!promptMetadata[category]) {
      throw new Error(`❌ Categoría inválida detectada: ${category}`);
    }
    const isValidPrompt = promptKey === null || promptMetadata[category].includes(promptKey);
    if (!isValidPrompt) {
      throw new Error(`❌ Prompt key inválido: ${promptKey} para categoría: ${category}`);
    }
    debugLog("🧠 Clasificación final:", { category, promptKey });
    return { category, promptKey };
  } catch (e) {
    console.error("❌ Error al parsear o validar respuesta del clasificador:", res.content);
    return { category: "retrieval_based", promptKey: null };
  }
}

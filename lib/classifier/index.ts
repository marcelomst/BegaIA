import { ChatOpenAI } from "@langchain/openai";
import { promptMetadata } from "../prompts/promptMetadata";
import { debugLog } from "../utils/debugLog";
import { normalizeCategory } from "./categoryAliases";
export type Classification = {
  category: string;
  promptKey?: string | null;
};
process.env.OPENAI_LOG = "off";

const classifierModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

export async function classifyQuery(question: string): Promise<Classification> {
  const allowedCategories = Object.keys(promptMetadata).join(", ");
  const allPromptKeys = Object.entries(promptMetadata)
    .flatMap(([_, keys]) => keys)
    .filter(Boolean);

  const prompt = `
Dada la siguiente consulta del usuario, responde solo con un JSON válido con dos campos:

- "category": una de las siguientes: ${allowedCategories}
- "promptKey": si la categoría necesita un prompt curado especial, elige una de: [${allPromptKeys.join(", ")}]; si no, pon null.

Ejemplo de respuesta:
{
  "category": "retrieval_based",
  "promptKey": "room_info"
}

Consulta:
"${question}"
`.trim();

  const res = await classifierModel.invoke([{ role: "user", content: prompt }]);

  try {
    const parsed = JSON.parse(res.content as string);
    let { category, promptKey } = parsed;
      // 🔄 Normalizar la categoría
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

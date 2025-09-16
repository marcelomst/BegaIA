// Path: /root/begasist/lib/classifier/index.ts
import { ChatOpenAI } from "@langchain/openai";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { promptMetadata } from "@/lib/prompts";              // ⬅️ unificado
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { IntentCategory, DesiredAction } from "@/types/audit"; // ⬅️ tipos centrales
import { looksRoomInfo } from "@/lib/agents/helpers";

export type Classification = {
  category: IntentCategory;
  promptKey: string | null;
  desiredAction?: DesiredAction; // ⬅️ ahora opcional y tipado
};

// …resto del archivo igual…

function normalizeCategory(c: string): IntentCategory {
  const m = (c || "").trim().toLowerCase();
  const known: IntentCategory[] = [
    "reservation",
    "cancel_reservation",
    "amenities",
    "billing",
    "support",
    "retrieval_based",
  ];
  return (known as string[]).includes(m) ? (m as IntentCategory) : "retrieval_based";
}

export async function classifyQuery(
  question: string,
  hotelId: string
): Promise<Classification> {
  // ⚙️ Aseguramos idioma siempre definido (evita TS2345: string | undefined)
  const nativeLang = await getHotelNativeLanguage(hotelId);
  const lang: string = (typeof nativeLang === "string" && nativeLang) ? nativeLang : "es";

  // ⚙️ getDictionary exige string (no undefined)
  const dict = await getDictionary(lang);

  const allowedCategories = Object.keys(promptMetadata).join(", ");
  const allPromptKeys = Object.entries(promptMetadata)
    .flatMap(([_, keys]) => keys)
    .filter(Boolean);

  let prompt = String(dict.classifierPrompt || "")
    .replace("{{allowedCategories}}", allowedCategories)
    .replace("{{allPromptKeys}}", allPromptKeys.join(", "))
    .replace("{{question}}", question);

 const model = new ChatOpenAI({
   modelName: process.env.LLM_CLASSIFIER_MODEL || "gpt-4o-mini",
   temperature: 0,
 });
  const res = await model.invoke([
    new SystemMessage("Eres un router de intents. Responde SOLO JSON válido."),
    new HumanMessage(prompt),
  ]);
  try {
    const content = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    const parsed = JSON.parse(content) as { category?: string; promptKey?: string | null };

    // 🧼 Tipado fuerte: cat final es IntentCategory (evita TS2322)
    const rawCategory = typeof parsed.category === "string" ? parsed.category : "";
    const cat: IntentCategory = normalizeCategory(rawCategory);

    // Validación de categoría
    if (!promptMetadata[cat]) {
      throw new Error(`❌ Categoría inválida detectada: ${rawCategory}`);
    }

    // Validación de promptKey
    let promptKey: string | null =
      typeof parsed.promptKey === "string" ? parsed.promptKey : null;

    const validPK = promptKey === null || promptMetadata[cat].includes(promptKey);
    if (!validPK) {
      // Si el PK no cuadra con la categoría, lo descartamos
      promptKey = null;
    }

    // 🔎 Regla de negocio: si es pregunta de horarios/políticas → forzar room_info
    if (cat === "retrieval_based" && (!promptKey /*|| promptKey === "ambiguity_policy"*/)) {
      if (looksRoomInfo(question)) promptKey = "room_info";
    }

    // Log útil
    // console.log("🧠 Clasificación (LLM):", { category: cat, promptKey });

    return { category: cat, promptKey };
  } catch (e) {
    console.error("❌ Error al parsear/validar clasificador:", res.content);
    // Fallback robusto: retrieval room_info si corresponde
    return {
      category: "retrieval_based",
      promptKey: looksRoomInfo(question) ? "room_info" : null,
    };
  }
}

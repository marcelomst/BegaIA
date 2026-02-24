// Path: /root/begasist/lib/classifier/index.ts
import { ChatOpenAI } from "@langchain/openai";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { promptMetadata } from "@/lib/prompts";              // ⬅️ unificado
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { IntentCategory, DesiredAction } from "@/types/audit"; // ⬅️ tipos centrales
import { looksRoomInfo } from "@/lib/agents/helpers";

type ClassifierCategory = IntentCategory | "greeting";

export type Classification = {
  category: ClassifierCategory;
  promptKey: string | null;
  desiredAction?: DesiredAction; // ⬅️ ahora opcional y tipado
};

// …resto del archivo igual…

export function isPureGreeting(question: string): boolean {
  const q = String(question || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ");
  const ql = q.toLowerCase();
  if (!q) return false;
  if (q.length > 40) return false;
  if (/\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?|\d{4}-\d{2}-\d{2}/.test(q)) return false;
  if (/\b(reserv(ar|a|as|e|o)?|reserva|booking|book|precio|tarifa|disponibilidad|habitaci[oó]n|room|rooms|doble|triple|suite|check[- ]?in|check[- ]?out)\b/i.test(q)) return false;
  if (!/^(hola|hi|hello|hey|buenas( tardes| noches)?|buenos dias|bom dia|ola|oi)$/i.test(q)) return false;
  return ql.split(/\s+/).length <= 3;
}

function normalizeCategory(c: string): ClassifierCategory {
  const m = (c || "").trim().toLowerCase();
  const known: ClassifierCategory[] = [
    "greeting",
    "reservation",
    // Nueva categoría RAG (no intent explícito del grafo, pero válida para RAG)
    "cancellation" as any,
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
  if (isPureGreeting(question)) {
    return {
      category: "greeting",
      promptKey: "greeting",
    };
  }

  // ⚙️ Aseguramos idioma siempre definido (evita TS2345: string | undefined)
  const nativeLang = await getHotelNativeLanguage(hotelId);
  const lang: string = (typeof nativeLang === "string" && nativeLang) ? nativeLang : "es";

  // ⚙️ getDictionary exige string (no undefined)
  const dict = await getDictionary(lang);

  const allowedCategories = [...Object.keys(promptMetadata), "greeting"].join(", ");
  const allPromptKeys = Object.entries(promptMetadata)
    .flatMap(([_, keys]) => keys)
    .filter(Boolean);

  let prompt = String(dict.classifierPrompt || "")
    .replace("{{allowedCategories}}", allowedCategories)
    .replace("{{allPromptKeys}}", allPromptKeys.join(", "))
    .replace("{{question}}", question);
  prompt += `

Regla adicional obligatoria:
- Responde {"category":"greeting","promptKey":"greeting"} SOLO si el mensaje es un saludo puro (ej: "Hola", "Hi", "Hello", "Bom dia").
- NO uses "greeting" si el mensaje mezcla saludo + intención (ej: "Hola quiero reservar", "Buenas, precio doble").`;

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
    let cat: ClassifierCategory = normalizeCategory(rawCategory);

    // Validación de categoría
    if (cat !== "greeting" && !promptMetadata[cat]) {
      throw new Error(`❌ Categoría inválida detectada: ${rawCategory}`);
    }

    // Validación de promptKey
    let promptKey: string | null =
      typeof parsed.promptKey === "string" ? parsed.promptKey : null;

    const validPK =
      cat === "greeting"
        ? (promptKey === null || promptKey === "greeting")
        : (promptKey === null || promptMetadata[cat].includes(promptKey));
    if (!validPK) {
      // Si el PK no cuadra con la categoría, lo descartamos
      promptKey = null;
    }

    if (cat === "greeting") {
      if (isPureGreeting(question)) {
        promptKey = "greeting";
      } else {
        cat = /\b(reserv(ar|a|as|e|o)?|reserva|booking|book)\b/i.test(question)
          ? "reservation"
          : "retrieval_based";
        promptKey = null;
      }
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

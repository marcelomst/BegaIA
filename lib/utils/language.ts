import { franc } from "franc";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { debugLog } from "./debugLog";

const iso6393to1: Record<string, string> = {
  spa: "es",
  eng: "en",
  ita: "it",
  fra: "fr",
  por: "pt",
  deu: "de",
  rus: "ru",
  // agrega los que uses realmente
};

function looksSpanish(text: string): boolean {
  // Palabras que casi nunca están en portugués
  const espWords = ["qué", "hora", "es", "cómo", "cuándo", "dónde", "habitación", "gracias", "está", "eres"];
  return espWords.some(word => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(word));
}

function looksPortuguese(text: string): boolean {
  // Palabras típicas de portugués, NO español
  const ptWords = ["você", "será", "agora", "obrigado", "quarto", "está", "estás"];
  return ptWords.some(word => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(word));
}

export async function detectLanguage(text: string, hotelId: string): Promise<string> {
  const minLengthShort = 15;
  const minLengthMedium = 30;

  if (!text || text.trim().length < minLengthShort) {
    debugLog("🔤 Texto muy corto, usando idioma del hotel");
    return await getHotelNativeLanguage(hotelId);
  }

  debugLog("🔍 Detectando idioma de:", text);
  const lang3 = franc(text.trim(), { minLength: 3 });
  debugLog("🔍 Idioma detectado (ISO639-3):", lang3);
  let lang2 = iso6393to1[lang3];

  // Heurística para textos de 15-30 caracteres
  if (text.trim().length < minLengthMedium) {
    if (lang3 === "por" && looksSpanish(text)) {
      debugLog("⚡️ Heurística: franc dice POR pero parece español, forzando ES");
      lang2 = "es";
    } else if (lang3 === "spa" && looksPortuguese(text)) {
      debugLog("⚡️ Heurística: franc dice SPA pero parece portugués, forzando PT");
      lang2 = "pt";
    }
  }

  if (!lang2) {
    debugLog("❓ Idioma no soportado, usando fallback del hotel:", lang3);
    return await getHotelNativeLanguage(hotelId);
  }
  return lang2;
}
// Path: /root/begasist/lib/i18n/translateIfNeeded.ts

import { ChatOpenAI } from "@langchain/openai";
import { debugLog } from "../utils/debugLog";
import { SUPPORTED_LANGS, type SupportedLang } from "./index";

// Flags/config por ENV (sin hardcodear valores en código)
const ENABLE_TRANSLATION = process.env.ENABLE_TRANSLATION !== "false";
const TRANSLATION_MODEL = process.env.TRANSLATION_MODEL || "gpt-4o";
const TRANSLATION_TEMPERATURE = Number(process.env.TRANSLATION_TEMPERATURE ?? 0);

// Lazy model (no instanciar si está deshabilitado)
const translationModel = ENABLE_TRANSLATION
  ? new ChatOpenAI({ model: TRANSLATION_MODEL, temperature: TRANSLATION_TEMPERATURE })
  : null;

function normalizeLang(lang: string): SupportedLang {
  return (SUPPORTED_LANGS.includes(lang as SupportedLang) ? lang : "en") as SupportedLang;
}

/**
 * Traduce texto entre idiomas si hace falta.
 * Si sourceLang === targetLang, retorna el texto original.
 * Backend: LLM (configurable por ENV). Se puede cambiar por otro proveedor sin tocar el resto del código.
 */
export async function translateIfNeeded(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text) return text;

  const from = normalizeLang(sourceLang);
  const to = normalizeLang(targetLang);

  if (from === to) return text;
  if (!ENABLE_TRANSLATION || !translationModel) {
    debugLog(`🔄 Traducción deshabilitada (ENV). Devolviendo texto original (${from}→${to}).`);
    return text; // fallback no-destructivo
  }

  debugLog(`🔄 Traduciendo de ${from} a ${to}:`, text);

  const systemPrompt = `
ERES UN SERVICIO DE TRADUCCIÓN AUTOMÁTICA.
Debes traducir EXACTAMENTE el texto que te envíe del idioma '${from}' al idioma '${to}'.
No agregues explicaciones ni contexto. No menciones capacidades ni entrenamiento.
Responde SOLO con la traducción literal. Mantén emojis y formato Markdown.
EJEMPLOS:
Input: Hello, how are you? => Hola, ¿cómo estás?
Input: Check-in  time? => ¿A qué hora es el check in?
Input: 😊 Welcome! => 😊 ¡Bienvenido!
INICIO DE LA TRADUCCIÓN:
`.trim();

  try {
    const res = await translationModel.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ]);
    return typeof res.content === "string" ? res.content : text;
  } catch (err) {
    debugLog("⚠️ Error al traducir, devolviendo texto original:", err);
    return text; // fallback seguro
  }
}

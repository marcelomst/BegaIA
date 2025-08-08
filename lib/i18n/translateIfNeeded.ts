// Path: /root/begasist/lib/i18n/translateIfNeeded.ts

import { ChatOpenAI } from "@langchain/openai";
import { debugLog } from "../utils/debugLog";

/**
 * Traduce texto entre idiomas si hace falta.
 * Si sourceLang === targetLang, retorna el texto original.
 * Usa un LLM (GPT) por defecto, pero se puede reemplazar por cualquier servicio.
 */
const translationModel = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });

export async function translateIfNeeded(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  debugLog(`🔄 Traduciendo de ${sourceLang} a ${targetLang}:`, text);
  if (!text || sourceLang === targetLang) return text;
  const systemPrompt = `
    ERES UN SERVICIO DE TRADUCCIÓN AUTOMÁTICA.
    Debes traducir EXACTAMENTE el texto que te envíe del idioma '${sourceLang}' al idioma '${targetLang}'.
    No agregues ninguna explicación, contexto ni disclaimers.
    No digas nada sobre tu entrenamiento o capacidades.
    No respondas con nada más que la traducción literal.
    Mantén emojis y formato Markdown.
    EJEMPLOS:
    Input: Hello, how are you? => Hola, ¿cómo estás?
    Input: Check-in  time? => ¿A qué hora es el check in?
    Input: 😊 Welcome! => 😊 ¡Bienvenido!
    INICIO DE LA TRADUCCIÓN:
    `;  
const res = await translationModel.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: text },
  ]);
  return typeof res.content === "string" ? res.content : text;
}

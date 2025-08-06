// Path: /root/begasist/lib/utils/analyzeSentiment.ts

import { ChatOpenAI } from "@langchain/openai";
import { getDictionary } from "@/lib/i18n/getDictionary";

/**
 * Analiza el sentimiento de un mensaje usando OpenAI.
 * Toma los textos i18n desde los diccionarios por idioma.
 * @param text Texto a analizar
 * @param lang Idioma del análisis ('es', 'en', 'pt'), default 'en'
 * @returns "positive" | "neutral" | "negative"
 */
export async function analyzeSentiment(
  text: string,
  lang: string = "en"
): Promise<"positive" | "neutral" | "negative"> {
  const dict = await getDictionary(lang);
  // El diccionario debe tener el campo: sentimentPrompt
  // Ejemplo: 'Analiza el sentimiento del siguiente mensaje...'
  const prompt = dict.sentimentPrompt.replace("{{text}}", text);

  const model = new ChatOpenAI({ modelName: "gpt-3.5-turbo", temperature: 0 });
  const result = await model.invoke([{ role: "user", content: prompt }]);
  const response = (result.content as string).toLowerCase().trim();
  if (response.includes("positive")) return "positive";
  if (response.includes("negative")) return "negative";
  return "neutral";
}

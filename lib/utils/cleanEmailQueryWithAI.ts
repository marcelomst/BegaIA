// Path: /root/begasist/lib/utils/cleanEmailQueryWithAI.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Podés alternar entre "gpt-3.5-turbo" o "gpt-4"
const model = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-3.5-turbo", // cambiar a "gpt-4" si querés mayor fidelidad
});

const systemPrompt = `
Estás limpiando correos electrónicos enviados a un hotel. Los mensajes pueden incluir saludos, firmas automáticas o texto irrelevante como "Enviado desde mi iPhone", "Gracias", o firmas al final.

Tu tarea es:
- Extraer exactamente la consulta del huésped, sin reinterpretarla.
- Si hay más de una frase, conservar solo la parte donde formula su consulta o petición.
- No parafrasees ni reformules el texto.
- Conserva las palabras originales del huésped siempre que sea posible.

Responde solo con la consulta literal del huésped, sin explicaciones ni formato.
`.trim();

export async function cleanEmailQueryWithAI(originalText: string): Promise<string> {
  try {
    const result = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(originalText),
    ]);
    return typeof result.content === "string" ? result.content.trim() : originalText;
  } catch (err) {
    console.error("🛑 Error limpiando email con IA:", err);
    return originalText;
  }
}

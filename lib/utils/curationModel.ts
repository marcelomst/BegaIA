// Path: /root/begasist/lib/utils/curationModel.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const SYSTEM_PROMPT = `
Este es el cuerpo completo de un email recibido en un hotel. El texto puede incluir saludos, firmas automáticas o frases como "Enviado desde mi iPhone" o "Enviado desde Proton Mail".
Tu tarea es identificar y extraer únicamente la consulta real del huésped, sin frases automáticas, firmas ni contenido irrelevante.
Responde solo con la consulta limpia del huésped, sin explicaciones ni formato.
`.trim();

export async function cleanEmailQuery({
  originalText,
  preferredModel = "gpt-3.5-turbo",
}: {
  originalText: string;
  preferredModel?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o";
}): Promise<string> {
  console.log("🧠 [curationModel] Modelo seleccionado para curar el email:", preferredModel);

  const model = new ChatOpenAI({
    temperature: 0,
    modelName: preferredModel,
  });

  try {
    const result = await model.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(originalText),
    ]);
    return typeof result.content === "string" ? result.content.trim() : originalText;
  } catch (err) {
    console.error("🛑 Error limpiando email con IA:", err);
    return originalText;
  }
}

// lib/classifier/index.ts

import { ChatOpenAI } from "@langchain/openai";

export type Classification = {
  category: string;
  promptKey?: string | null;
};

const classifierModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

export async function classifyQuery(question: string): Promise<Classification> {
  const prompt = `
Dada la siguiente consulta del usuario, responde solo con un JSON válido con dos campos:

- "category": una de las siguientes: "room_info", "reservation", "services", "billing", "support", "location", "other"
- "promptKey": si la categoría necesita un prompt curado especial, indica su clave. Si no, pon null.

Ejemplo de respuesta:
{
  "category": "room_info",
  "promptKey": "room_info"
}

Consulta:
"${question}"
  `.trim();

  const res = await classifierModel.invoke([
    { role: "user", content: prompt },
  ]);

  try {
    return JSON.parse(res.content as string);
  } catch (e) {
    console.error("❌ Error al parsear respuesta del clasificador:", res.content);
    return { category: "other", promptKey: null };
  }
}

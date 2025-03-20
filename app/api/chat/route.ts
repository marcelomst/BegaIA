import { NextResponse } from "next/server";

import { agentGraph } from "/..//lib/agents/index.ts";


import { HumanMessage, AIMessage } from "@langchain/core/messages";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    console.log("🔍 Consulta recibida:", query);

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(query)],
    });

    // Buscar el primer mensaje que sea un AIMessage y obtener su contenido
    const aiMessage = response.messages.find(msg => msg instanceof AIMessage) as AIMessage | undefined;
    const responseText = aiMessage?.content || "No se encontró una respuesta.";

    console.log("📌 Respuesta enviada:", responseText);

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("⛔ Error en la API /api/chat:", error);
    return NextResponse.json({ response: "Ocurrió un error al procesar la solicitud." }, { status: 500 });
  }
}

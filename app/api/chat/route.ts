// /root/begasist/app/api/chat/route.ts

import { NextResponse } from "next/server";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "../../../lib/utils/debugLog";

process.env.OPENAI_LOG = "off";
export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    debugLog("🔍 Consulta recibida:", query);

    const hotelId = "hotel123"; // fallback

    if (!hotelId) {
      console.warn("⚠️ [API /chat] hotelId no proporcionado. Usando fallback: 'hotel123'");
    }

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(query)],
      hotelId,
    });
    
    // Buscar el último mensaje que sea un AIMessage y obtener su contenido
    const aiMessage = response.messages.findLast(
      (msg) => msg instanceof AIMessage
    ) as AIMessage | undefined;

    const responseText = aiMessage?.content || "No se encontró una respuesta.";

    debugLog("📌 Respuesta enviada:", responseText);

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("⛔ Error en la API /api/chat:", error);
    return NextResponse.json(
      { response: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

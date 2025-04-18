// /app/api/chat/route.ts

import { NextResponse } from "next/server";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { webMemory } from "@/lib/services/webMemory";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    debugLog("🔍 Consulta recibida:", query);

    const hotelId = "hotel123"; // fallback para pruebas

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(query)],
      hotelId,
    });

    const aiMessage = response.messages.findLast(
      (msg) => msg instanceof AIMessage
    ) as AIMessage | undefined;

    const responseText = aiMessage?.content || "No se encontró una respuesta.";

    // ✅ Agregamos timestamp ISO y time legible
    webMemory.addMessage({
      id: uuidv4(),
      sender: "Usuario Web",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date().toISOString(),
      content: query,
      suggestion: String(responseText),
      status: "pending",
    });

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

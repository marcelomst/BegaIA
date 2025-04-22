// /app/api/chat/route.ts

import { NextResponse } from "next/server";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { channelMemory } from "@/lib/services/channelMemory";
import { v4 as uuidv4 } from "uuid";
import type { Channel, ChannelMode} from "@/types/channel";

import { getHotelConfig } from "@/lib/config/hotelConfig"; // 👈 importá esto

export async function POST(req: Request) {
  try {
    const { query, channel }: { query: string; channel: Channel } = await req.json();


    debugLog("🔍 Consulta recibida:", query);

    const hotelId = "hotel123"; // fallback para pruebas
    
    // ✅ Obtenemos la config real del hotel
    const config = await getHotelConfig(hotelId);
    const mode: ChannelMode = config?.channelConfigs[channel]?.mode || "automatic"; // fallback a "automatic"

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(query)],
      hotelId,
    });

    const aiMessage = response.messages.findLast(
      (msg) => msg instanceof AIMessage
    ) as AIMessage | undefined;

    const responseText = aiMessage?.content || "No se encontró una respuesta.";

    const msg = {
      id: uuidv4(),
      sender: "Usuario Web",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date().toISOString(),
      content: query,
    };

    if (mode === "automatic" ) {
      channelMemory.addMessage({
        ...msg,
        approvedResponse: String(responseText),
        status: "sent",
        respondedBy: "assistant",
      });
    } else {
      channelMemory.addMessage({
        ...msg,
        suggestion: String(responseText),
        status: "pending",
        channel,
      });
    }

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


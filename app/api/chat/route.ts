// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { channelMemory } from "@/lib/services/channelMemory";
import { v4 as uuidv4 } from "uuid";
import type { Channel, ChannelMode, MessageStatus, ChannelMessage } from "@/types/channel";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: Request) {
  try {
    const { query, channel, hotelId }: { query: string; channel: Channel; hotelId?: string } = await req.json();

    debugLog("🔍 Consulta recibida:", query);

    const realHotelId = hotelId || "hotel123";
    const config = await getHotelConfig(realHotelId);
    const mode: ChannelMode = config?.channelConfigs[channel]?.mode || "automatic";

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(query)],
      hotelId: realHotelId,
    });

    const aiMessage = response.messages.findLast(
      (msg) => msg instanceof AIMessage
    ) as AIMessage | undefined;

    const responseText = aiMessage?.content || "No se encontró una respuesta.";

    const timestamp = new Date().toISOString();

    const status: MessageStatus = mode === "automatic" ? "sent" : "pending";

    const newMessage: ChannelMessage = {
      messageId: uuidv4(),
      sender: "Usuario Web",
      time: new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp,
      content: query,
      hotelId: realHotelId,
      channel,
      suggestion: String(responseText),
      status,
      approvedResponse: status === "sent" ? String(responseText) : undefined,
      respondedBy: status === "sent" ? "assistant" : undefined,
    };
    
    

    console.log("🧠 Agregando mensaje en memoria:", newMessage);

    channelMemory.addMessage(newMessage);

    debugLog("📌 Respuesta enviada:", responseText);

    return NextResponse.json({
      response: responseText,
      status,
      messageId: newMessage.messageId,
    });

  } catch (error) {
    console.error("⛔ Error en la API /api/chat:", error);
    return NextResponse.json(
      { response: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

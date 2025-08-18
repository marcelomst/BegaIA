// Path: /root/begasist/app/api/chat/route.ts

import { NextResponse } from "next/server";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "@/lib/utils/debugLog";
import { channelMemory } from "@/lib/services/channelMemory";
import { v4 as uuidv4 } from "uuid";
import type { Channel, ChannelMode, MessageStatus, ChannelMessage } from "@/types/channel";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { saveMessageToAstra } from "@/lib/db/messages";
import { createConversation, getConversationById, updateConversation } from "@/lib/db/conversations";
import { getGuest } from "@/lib/db/guests"; // 👈 Import correcto para backend

export async function POST(req: Request) {
  try {
    const H = (k: string) => req.headers.get?.(k);
    console.log(`[edge] ${req.method} ${new URL(req.url).pathname} host=${H("host")} ip=${H("cf-connecting-ip")||H("x-forwarded-for")} cf-ray=${H("cf-ray")} ua=${H("user-agent")}`);

    const {
      query,
      channel,
      hotelId,
      lang,
      conversationId,
      subject,
      guestId,
    }: {
      query: string;
      channel: Channel;
      hotelId?: string;
      lang?: string;
      conversationId?: string;
      subject?: string;
      guestId?: string;
    } = await req.json();

    debugLog("🔍 Consulta recibida:", query);

    const realHotelId = hotelId || "hotel999";
    const config = await getHotelConfig(realHotelId);
    const mode: ChannelMode = config?.channelConfigs[channel]?.mode || "automatic";
    const idiomaFinal = lang || config?.defaultLanguage || "es";

    // Asegurarse de siempre usar el conversationId recién creado para los mensajes
    let currentConversationId = conversationId;
    try {
      if (!currentConversationId) {
        const convo = await createConversation({
          hotelId: realHotelId,
          channel,
          lang: idiomaFinal,
          guestId,
          subject: subject ?? "",
        });
        currentConversationId = convo.conversationId;
      } else {
        const existing = await getConversationById(currentConversationId);
        if (!existing) {
          const convo = await createConversation({
            hotelId: realHotelId,
            channel,
            lang: idiomaFinal,
            conversationId: currentConversationId,
            guestId,
            subject: subject ?? "",
          });
        } else {
          await updateConversation(currentConversationId, {
            lastUpdatedAt: new Date().toISOString(),
            lang: idiomaFinal,
            subject: typeof subject === "string" ? subject : undefined,
          });
        }
      }
    } catch (err) {
      console.error("⛔ Error persistiendo conversación en AstraDB:", err);
      return NextResponse.json(
        { response: "Error creando/conectando conversación." },
        { status: 500 }
      );
    }

    // ---- Guardar mensaje del usuario ----
    const timestampUser = new Date().toISOString();
    const userMessage: ChannelMessage = {
      messageId: uuidv4(),
      sender: guestId || "Usuario Web",
      time: new Date(timestampUser).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: timestampUser,
      content: query,
      hotelId: realHotelId,
      channel,
      suggestion: "",
      status: "sent",
      conversationId: currentConversationId, // <--- SIEMPRE este id, recién generado si aplica
      guestId,
    };
    try {
      await saveMessageToAstra(userMessage);
      console.log("✅ Mensaje de usuario guardado en AstraDB:", userMessage.messageId);
    } catch (err) {
      console.error("⛔ Error guardando mensaje usuario en AstraDB:", err);
      channelMemory.addMessage(userMessage);
    }

    // ---- Guardar mensaje de IA ----
    const prompt = `Responde SIEMPRE en ${idiomaFinal}. ${query}`;
    const response = await agentGraph.invoke({
      messages: [new HumanMessage(prompt)],
      hotelId: realHotelId,
      conversationId: currentConversationId,
      // preferredLanguage: idiomaFinal, // si tu agentGraph lo acepta
    });

    const aiMessage = response.messages.findLast(
      (msg) => msg instanceof AIMessage
    ) as AIMessage | undefined;

    const responseText = aiMessage?.content || "No se encontró una respuesta.";
    const timestampAI = new Date().toISOString();

    // 👇 **PRIORIDAD: guest.mode > channel.mode**
    let effectiveMode: ChannelMode = mode;
    if (guestId) {
      try {
        const guestProfile = await getGuest(realHotelId, guestId);
        if (guestProfile && guestProfile.mode) {
          effectiveMode = guestProfile.mode;
        }
      } catch (err) {
        console.warn("No se pudo obtener el perfil del guest para modo personalizado:", err);
      }
    }
    const status: MessageStatus = effectiveMode === "automatic" ? "sent" : "pending";

    const assistantMessage: ChannelMessage = {
      messageId: uuidv4(),
      sender: "assistant",
      time: new Date(timestampAI).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: timestampAI,
      content: "",
      hotelId: realHotelId,
      channel,
      suggestion: String(responseText),
      status,
      approvedResponse: status === "sent" ? String(responseText) : undefined,
      respondedBy: status === "sent" ? "assistant" : undefined,
      conversationId: currentConversationId,
      guestId,
    };
    try {
      await saveMessageToAstra(assistantMessage);
      console.log("✅ Mensaje IA guardado en AstraDB:", assistantMessage.messageId);
    } catch (err) {
      console.error("⛔ Error guardando mensaje IA en AstraDB:", err);
      channelMemory.addMessage(assistantMessage);
    }

    debugLog("📌 Respuesta enviada:", responseText);

    return NextResponse.json({
      response: responseText,
      status,
      messageId: assistantMessage.messageId,
      conversationId: currentConversationId,
      lang: idiomaFinal,
      subject: typeof subject === "string" ? subject : undefined,
    });

  } catch (error) {
    console.error("⛔ Error en la API /api/chat:", error);
    return NextResponse.json(
      { response: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

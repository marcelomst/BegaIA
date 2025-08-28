// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import type { ChannelMessage, ChannelMode } from "@/types/channel";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getAdapter } from "@/lib/adapters/registry";

export async function POST(req: Request) {
  try {
    const {
      query,
      channel = "web",
      hotelId,
      lang,
      conversationId,
      subject,
      guestId,
    }: {
      query: string;
      channel?: "web";
      hotelId?: string;
      lang?: string;
      conversationId?: string;
      subject?: string;
      guestId?: string;
    } = await req.json();

    const realHotelId = hotelId || "hotel999";

    // Modo por config (guest.mode > channel.mode lo resuelve handle si así lo hacés allí;
    // aquí usamos el modo del canal como default)
    const config = await getHotelConfig(realHotelId);
    const channelMode: ChannelMode =
      (config?.channelConfigs?.web?.mode as ChannelMode) || "automatic";
    const idiomaFinal = lang || config?.defaultLanguage || "es";

    const now = new Date();
    const msg: ChannelMessage = {
      messageId: uuidv4(),
      hotelId: realHotelId,
      channel: "web",
      conversationId,              // si viene vacío, handleIncomingMessage crea/usa uno
      sender: guestId || "Usuario Web",
      guestId,
      content: String(query ?? ""),
      timestamp: now.toISOString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestion: "",
      status: "sent",
      role: "user",
      detectedLanguage: idiomaFinal,
      subject,
    };

    // Adapter web para entrega en tiempo real (SSE)
    const web = getAdapter("web");
    if (!web) {
      return NextResponse.json(
        { response: "Web adapter no registrado" },
        { status: 500 }
      );
    }

    let lastReply: string | null = null;

    await handleIncomingMessage(msg, {
      autoReply: true,
      mode: channelMode,
      sendReply: async (reply: string) => {
        // entrega por SSE al widget
        await web.sendReply(
          { hotelId: realHotelId, conversationId: msg.conversationId!, channel: "web" },
          reply
        );
        lastReply = reply; // compatibilidad con front actual
      },
    });

    return NextResponse.json({
      response: lastReply, // tu front actual lo usa para pintar la primera respuesta
      status: channelMode === "automatic" ? "sent" : "pending",
      messageId: msg.messageId,
      conversationId: msg.conversationId,
      lang: idiomaFinal,
      subject: typeof subject === "string" ? subject : undefined,
    });
  } catch (err) {
    console.error("⛔ Error en /api/chat:", err);
    return NextResponse.json(
      { response: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

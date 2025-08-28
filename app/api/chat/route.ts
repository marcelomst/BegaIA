// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import type { ChannelMessage, ChannelMode } from "@/types/channel";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getAdapter } from "@/lib/adapters/registry";

/**
 * Endpoint público para mensajes del widget web.
 * - Devuelve siempre `conversationId` para que el widget lo persista.
 * - Si existe el adapter "web", streamea por SSE (sendReply) y NO devuelve `response` en JSON.
 * - Si NO existe el adapter "web", devuelve la primera respuesta en `response` como fallback.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      query: string;
      channel?: "web";
      hotelId?: string;
      lang?: string;
      conversationId?: string;
      subject?: string;
      guestId?: string;
    };

    const {
      query,
      channel = "web",
      hotelId,
      lang,
      conversationId,
      subject,
      guestId,
    } = body || {};

    if (channel !== "web") {
      return NextResponse.json(
        { response: "Canal no soportado en este endpoint.", channel },
        { status: 400 }
      );
    }

    const text = String(query ?? "").trim();
    if (!text) {
      return NextResponse.json(
        { response: "Falta el mensaje (query)." },
        { status: 400 }
      );
    }

    const realHotelId = hotelId || "hotel999";
    const config = await getHotelConfig(realHotelId);
    const channelMode: ChannelMode =
      (config?.channelConfigs?.web?.mode as ChannelMode) || "automatic";
    const idiomaFinal = lang || config?.defaultLanguage || "es";

    // conversationId garantizado desde el backend (el widget lo guarda en localStorage)
    const ensuredConversationId = conversationId || uuidv4();

    const now = new Date();
    const msg: ChannelMessage = {
      messageId: uuidv4(),
      hotelId: realHotelId,
      channel: "web",
      conversationId: ensuredConversationId,
      sender: guestId || "Usuario Web",
      guestId: guestId || "web-guest",
      content: text,
      timestamp: now.toISOString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestion: "",
      status: "sent",
      role: "user",
      detectedLanguage: idiomaFinal,
      subject,
    };

    const web = getAdapter("web"); // puede ser undefined en dev
    const sseEnabled = Boolean(web);

    let lastReply: string | null = null;

    if (sseEnabled) {
      // Flujo normal con SSE: enviar por adapter
      await handleIncomingMessage(msg, {
        autoReply: true,
        mode: channelMode,
        sendReply: async (reply: string) => {
          await web!.sendReply(
            {
              hotelId: realHotelId,
              conversationId: msg.conversationId!,
              channel: "web",
            },
            reply
          );
          // NO seteamos lastReply para evitar duplicar con la respuesta JSON
        },
      });
    } else {
      // Fallback sin adapter: devolvemos la primera respuesta en JSON
      const result: any = await handleIncomingMessage(msg, {
        autoReply: true,
        mode: channelMode,
      });
      if (typeof result === "string") {
        lastReply = result;
      } else if (result?.response) {
        lastReply =
          typeof result.response === "string"
            ? result.response
            : JSON.stringify(result.response);
      } else {
        lastReply = "🕓 Recibimos tu mensaje. Te respondemos por este chat en segundos.";
      }
    }

    return NextResponse.json({
      // si hay SSE, NO mandamos `response` para evitar duplicados en el widget
      response: sseEnabled ? null : lastReply,
      status: channelMode === "automatic" ? "sent" : "pending",
      messageId: msg.messageId,
      conversationId: msg.conversationId,
      lang: idiomaFinal,
      subject: typeof subject === "string" ? subject : undefined,
      sse: sseEnabled,
    });
  } catch (err) {
    console.error("⛔ Error en /api/chat:", err);
    return NextResponse.json(
      { response: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}

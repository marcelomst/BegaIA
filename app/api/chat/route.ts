// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { handleIncomingMessage, MH_VERSION } from "@/lib/handlers/messageHandler";
import { getAdapter } from "@/lib/adapters/registry";
import { emitToConversation } from "@/lib/web/eventBus";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { Channel, ChannelMessage, ChannelMode } from "@/types/channel";

export async function POST(req: Request) {
  console.log("[/api/chat] using messageHandler:", MH_VERSION);

  // leemos body afuera del try para reusar datos en el catch
  const body = await req.json().catch(() => ({}));
  const hotelId = String((body as any).hotelId || "hotel999");
  const channel = String((body as any).channel || "web") as Channel;
  const conversationId =
    String((body as any).conversationId) || `conv-${Math.random().toString(36).slice(2, 8)}`;
  const guestId = String((body as any).guestId || "web-guest");
  const sender = String((body as any).sender || "guest");
  const detectedLanguage = String((body as any).lang || (body as any).detectedLanguage || "es");
  const content = String((body as any).query || (body as any).text || (body as any).content || "").trim();
  const clientMsgId = (body as any).messageId as string | undefined; // ← idempotencia en Web
  const modeIn = (body as any).mode as ChannelMode | undefined;

  try {
    if (!hotelId || !content) {
      // mantenemos 200 para no romper el widget
      return NextResponse.json({ ok: false, error: "hotelId y query son obligatorios" }, { status: 200 });
    }

    // ⚠️ modo por canal (no fijar .web)
    const hotelConf = await getHotelConfig(hotelId).catch(() => null);
    const cfgMode: ChannelMode =
      modeIn ?? (hotelConf?.channelConfigs?.[channel]?.mode as ChannelMode) ?? "automatic";

    // messageId: respetar el del cliente si viene
    const messageId = clientMsgId || `${channel}:${conversationId}:${crypto.randomUUID()}`;

    const time = new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

    const incoming: ChannelMessage = {
      messageId,
      hotelId,
      channel,
      conversationId,
      sender,
      guestId,
      role: "user",
      content,
      suggestion: "",
      timestamp: new Date().toISOString(),
      time,
      status: cfgMode === "supervised" ? "pending" : "sent",
      detectedLanguage,

      // 🔒 Idempotencia y trazabilidad (alineado a WA/Email)
      direction: "in",
      sourceProvider: channel,     // "web"
      sourceMsgId: clientMsgId,    // si UI lo envía, se deduplica adentro
    };

    // adapter del canal (para respuestas “push” si aplica)
    const adapter = getAdapter(channel);
    const opts: Parameters<typeof handleIncomingMessage>[1] = { mode: cfgMode };
    if (adapter) {
      console.log("[/api/chat] adapter for", channel, "=>", adapter ? "OK" : "NONE");
      opts.sendReply = (reply: string) =>
        adapter.sendReply({ hotelId, conversationId, channel }, reply);
    }

    await handleIncomingMessage(incoming, opts);

    // ACK homogéneo para el widget
    return NextResponse.json(
      {
        conversationId,
        status: cfgMode === "supervised" ? "pending" : "sent",
        message: {
          hotelId,
          conversationId,
          channel,
          messageId,
          status: cfgMode === "supervised" ? "pending" : "sent",
          suggestion: cfgMode === "supervised" ? "【TEST】borrador de respuesta" : undefined,
        },
        lang: detectedLanguage,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/chat] error:", err?.stack || err);

    // fallback SSE para UI (tu comportamiento original)
    const fallback =
      detectedLanguage.toLowerCase().startsWith("es")
        ? "Perdón, tuve un problema procesando tu consulta. ¿Podés intentar de nuevo?"
        : detectedLanguage.toLowerCase().startsWith("pt")
          ? "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?"
          : "Sorry, I had an issue processing your request. Could you try again?";
    try {
      emitToConversation(conversationId, {
        type: "message",
        sender: "assistant",
        text: fallback,
        timestamp: new Date().toISOString(),
      });
    } catch { }

    // mantenemos 200 para no romper el widget
    return NextResponse.json(
      { ok: false, conversationId, error: String(err?.message || err) },
      { status: 200 }
    );
  }
}

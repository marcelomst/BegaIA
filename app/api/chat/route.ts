// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getAdapter } from "@/lib/adapters/registry";
import { emitToConversation } from "@/lib/web/eventBus";         // 👈 nuevo
import type { Channel, ChannelMessage } from "@/types/channel";
import crypto from "crypto";

export async function POST(req: Request) {
  // leemos body afuera del try para reusar datos en el catch
  const body = await req.json().catch(() => ({}));
  const hotelId = String((body as any).hotelId || "");
  const channel = String((body as any).channel || "web") as Channel;
  const conversationId = String((body as any).conversationId || crypto.randomUUID());
  const guestId = String((body as any).guestId || "web-guest");
  const sender = String((body as any).sender || "Usuario Web");
  const detectedLanguage = String((body as any).lang || (body as any).detectedLanguage || "es");
  const content = String((body as any).query || (body as any).text || "").trim();

  try {
    if (!hotelId || !content) {
      return NextResponse.json({ ok: false, error: "hotelId y query son obligatorios" }, { status: 200 });
    }

    const time = new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

    const incoming: ChannelMessage = {
      messageId: crypto.randomUUID(),
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
      status: "sent",
      detectedLanguage,
    };

    const adapter = getAdapter(channel);
    
    const opts: Parameters<typeof handleIncomingMessage>[1] = { mode: "automatic" };
    if (adapter) {
      console.log("[/api/chat] adapter for", channel, "=>", adapter ? "OK" : "NONE");
      opts.sendReply = (reply: string) =>
        adapter.sendReply({ hotelId, conversationId, channel }, reply);
    }

    await handleIncomingMessage(incoming, opts);

    // ✅ siempre 200: el widget no mostrará el cartel de error
    return NextResponse.json({ ok: true, conversationId }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/chat] error:", err?.stack || err);

    // 👇 Enviamos fallback por SSE para que el usuario vea algo en el chat
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
    } catch {}

    // ✅ respondemos 200 para no romper el widget
    return NextResponse.json({ ok: false, conversationId, error: String(err?.message || err) }, { status: 200 });
  }
}

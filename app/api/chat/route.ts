// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
// Ensure console.warn/error are captured to log.txt via debugLog hooks
import { logToFile } from "@/lib/utils/debugLog";
import crypto from "crypto";
import { ChannelMessageInputError, handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";
import { decideDeliveryPolicy } from "@/lib/pipeline/deliveryPolicy";
import type { Channel, ChannelMode } from "@/types/channel";

const BUILD_TAG = "2026-03-20-ARQSYS";
const DEBUG_CHAT = process.env.DEBUG === "1" || process.env.MCP_DEBUG === "1";
const SAFE_INPUT_MAX = 3000;

function jsonWithBuild(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("x-begasist-build", BUILD_TAG);
  return res;
}

function normText(value: unknown, max = SAFE_INPUT_MAX): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function logChat(event: string, data: Record<string, unknown>, level: "log" | "warn" | "error" = "log") {
  const payload = {
    ts: new Date().toISOString(),
    src: "api/chat",
    event,
    ...data,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    void logToFile("error", line);
    return;
  }
  if (DEBUG_CHAT) {
    void logToFile(level, line);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const hotelId = normText(body.hotelId, 120);
  const channel = (normText(body.channel, 30) || "web") as Channel;
  const incomingConversationId =
    normText(body.conversationId, 120) || normText(body.conversation_id, 120) || normText(body.convId, 120);
  const fallbackConversationId = incomingConversationId || `conv-${crypto.randomUUID()}`;
  const fallbackGuestId = channel === "web" ? `guest-${crypto.randomUUID()}` : "guest";
  const guestId = normText(body.guestId, 120) || fallbackGuestId;
  const sender = normText(body.sender, 60) || "guest";
  const content =
    normText(body.query) || normText(body.message) || normText(body.text) || normText(body.content);
  const explicitLang = normText(body.lang, 12) || normText(body.detectedLanguage, 12) || "es";
  const sourceMsgId = normText(body.messageId, 180) || undefined;
  const modeIn = normText(body.mode, 30) as ChannelMode | "";

  logChat("request.received", {
    build: BUILD_TAG,
    hotelId,
    channel,
    conversationId: incomingConversationId || undefined,
    hasClientMessageId: Boolean(sourceMsgId),
    textLength: content.length,
  });

  try {
    const result = await handleChannelMessage({
      query: content,
      channel,
      hotelId,
      lang: explicitLang,
      conversationId: incomingConversationId || undefined,
      guestId,
      sourceMsgId,
      mode: modeIn || undefined,
      sender,
    });
    const delivery = decideDeliveryPolicy({
      status: result.status,
      response: result.response,
      lang: result.lang,
      pendingAckEnabled: true,
    });

    const responsePayload = {
      conversationId: result.conversationId,
      status: result.status,
      message: {
        hotelId: result.hotelId || hotelId,
        conversationId: result.conversationId,
        channel: result.channel || channel,
        messageId: result.messageId,
        status: result.status,
        suggestion: delivery.shouldSendPendingAck ? delivery.pendingAckText : undefined,
      },
      response: delivery.shouldSendFinalReply ? delivery.finalReplyText : undefined,
      suggestedReply: delivery.shouldSendPendingAck ? result.suggestedReply : undefined,
      rich: result.rich,
      lang: result.lang,
      deduped: result.deduped || undefined,
    };

    logChat("request.completed", {
      hotelId,
      channel,
      conversationId: result.conversationId,
      status: result.status,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithBuild(responsePayload, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof ChannelMessageInputError) {
      return jsonWithBuild(
        { ok: false, error: err.message, status: "sent", conversationId: fallbackConversationId },
        { status: 400 }
      );
    }

    logChat(
      "request.failed",
      {
        hotelId,
        channel,
        conversationId: incomingConversationId || undefined,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      },
      "error"
    );

    const lc = explicitLang.toLowerCase();
    const fallback = lc.startsWith("es")
      ? "Perdón, tuve un problema procesando tu consulta. ¿Podés intentar de nuevo?"
      : lc.startsWith("pt")
        ? "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?"
        : "Sorry, I had an issue processing your request. Could you try again?";

    return jsonWithBuild({ ok: false, conversationId: fallbackConversationId, status: "sent", error: fallback }, { status: 500 });
  }
}

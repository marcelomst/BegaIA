// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
// Ensure console.warn/error are captured to log.txt via debugLog hooks
import { logToFile } from "@/lib/utils/debugLog";
import { ChannelMessageInputError, handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";
import { decideDeliveryPolicy } from "@/lib/pipeline/deliveryPolicy";
import type { Channel } from "@/types/channel";
import {
  GuestCapabilityError,
  guestCapabilityErrorResponse,
  runAuthorizedGuestConversationTurn,
} from "@/lib/auth/guestConversationCapability";
import { resolveGuestIdentity } from "@/lib/pipeline/resolveGuestIdentity";
import { getMessageBySourceId } from "@/lib/db/messages";

const BUILD_TAG = "2026-03-20-ARQSYS";
const DEBUG_CHAT = process.env.DEBUG === "1" || process.env.MCP_DEBUG === "1";
const SAFE_INPUT_MAX = 3000;

function jsonWithBuild(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("x-begasist-build", BUILD_TAG);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
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

  const incomingHotelId = normText(body.hotelId, 120);
  const channel = (normText(body.channel, 30) || "web") as Channel;
  const incomingConversationId =
    normText(body.conversationId, 120) || normText(body.conversation_id, 120) || normText(body.convId, 120);
  const incomingGuestId = normText(body.guestId, 120);
  const content =
    normText(body.query) || normText(body.message) || normText(body.text) || normText(body.content);
  const explicitLang = normText(body.lang, 12) || normText(body.detectedLanguage, 12) || "es";
  const clientMessageId = normText(body.messageId, 180);
  const validClientMessageId = /^[A-Za-z0-9._:-]{8,180}$/.test(clientMessageId);

  logChat("request.received", {
    build: BUILD_TAG,
    hotelId: incomingHotelId || undefined,
    channel,
    conversationId: incomingConversationId || undefined,
    hasClientMessageId: Boolean(normText(body.messageId, 180)),
    textLength: content.length,
  });

  try {
    const execution = await runAuthorizedGuestConversationTurn(
      req,
      validClientMessageId ? clientMessageId : `invalid-message-${crypto.randomUUID()}`,
      async (authorization) => {
        const { hotelId, conversationId, webSubject, guestId } = authorization;
        if (
          channel !== "web" ||
          (incomingHotelId && incomingHotelId !== hotelId) ||
          (incomingConversationId && incomingConversationId !== conversationId) ||
          (incomingGuestId && incomingGuestId !== guestId && incomingGuestId !== webSubject)
        ) {
          return {
            kind: "terminal" as const,
            response: jsonWithBuild({ ok: false, error: "Guest conversation binding mismatch" }, { status: 403 }),
          };
        }
        if (!content) {
          return {
            kind: "terminal" as const,
            response: jsonWithBuild({ ok: false, error: "message is required" }, { status: 400 }),
          };
        }
        if (!validClientMessageId) {
          return {
            kind: "terminal" as const,
            response: jsonWithBuild({ ok: false, error: "messageId is required" }, { status: 400 }),
          };
        }
        const resolvedIdentity = await resolveGuestIdentity({
          hotelId,
          channel: "web",
          rawGuestId: webSubject,
        });
        if (resolvedIdentity.guestId !== guestId) {
          return {
            kind: "terminal" as const,
            response: jsonWithBuild({ ok: false, error: "Guest conversation binding is invalid" }, { status: 401 }),
          };
        }

        const sourceMessageId = `guest:${crypto
          .createHash("sha256")
          .update(`${hotelId}\0${conversationId}\0${clientMessageId}`, "utf8")
          .digest("hex")}`;
        const existing = await getMessageBySourceId(hotelId, conversationId, sourceMessageId);
        if (existing) {
          return {
            kind: "already_recorded" as const,
            hotelId,
            conversationId,
            messageId: clientMessageId,
          };
        }

        const result = await handleChannelMessage({
          query: content,
          channel: "web",
          hotelId,
          lang: explicitLang,
          conversationId,
          guestId: webSubject,
          sourceMsgId: sourceMessageId,
          sender: "guest",
        });
        if (
          result.hotelId !== hotelId ||
          result.channel !== "web" ||
          result.conversationId !== conversationId
        ) {
          throw new Error("authorized conversation binding changed during processing");
        }
        const delivery = decideDeliveryPolicy({
          status: result.status,
          response: result.response,
          lang: result.lang,
          pendingAckEnabled: true,
        });
        return {
          kind: "processed" as const,
          result,
          responsePayload: {
            status: result.status,
            continuationAvailable: true,
            hotelId,
            channel: "web" as const,
            conversationId,
            messageId: result.messageId,
            message: {
              hotelId,
              conversationId,
              channel: "web" as const,
              status: result.status,
              suggestion: delivery.shouldSendPendingAck ? delivery.pendingAckText : undefined,
            },
            response: delivery.shouldSendFinalReply ? delivery.finalReplyText : undefined,
            rich: delivery.shouldSendFinalReply ? result.rich : undefined,
            lang: result.lang,
            deduped: result.deduped || undefined,
          },
        };
      },
    );

    const operation = execution.result;
    if (operation.kind === "terminal") return operation.response;
    if (operation.kind === "already_recorded") {
      return jsonWithBuild({
        ok: false,
        code: "guest_turn_already_recorded",
        status: "reconciliation_required",
        outcome: "already_recorded",
        retry: "do_not_retry",
        reconciliationRequired: true,
        continuationAvailable: false,
        hotelId: operation.hotelId,
        conversationId: operation.conversationId,
        messageId: operation.messageId,
      }, { status: 409 });
    }
    if (execution.reconciliationRequired) {
      return jsonWithBuild({
        ok: false,
        code: "guest_turn_completed_reconciliation_required",
        status: "reconciliation_required",
        outcome: "completed_reconciliation_required",
        retry: "do_not_retry",
        reconciliationRequired: true,
        continuationAvailable: false,
        hotelId: operation.result.hotelId,
        conversationId: operation.result.conversationId,
        messageId: clientMessageId,
      }, { status: 202 });
    }

    logChat("request.completed", {
      hotelId: operation.result.hotelId,
      channel: "web",
      conversationId: operation.result.conversationId,
      status: operation.result.status,
      durationMs: Date.now() - startedAt,
    });
    return jsonWithBuild(operation.responsePayload, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof GuestCapabilityError) {
      const res = guestCapabilityErrorResponse(err);
      res.headers.set("x-begasist-build", BUILD_TAG);
      return res;
    }
    if (err instanceof ChannelMessageInputError) {
      return jsonWithBuild(
        { ok: false, error: err.message, status: "sent" },
        { status: 400 }
      );
    }

    logChat(
      "request.failed",
      {
        hotelId: incomingHotelId || undefined,
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

    return jsonWithBuild({ ok: false, status: "sent", error: fallback }, { status: 500 });
  }
}

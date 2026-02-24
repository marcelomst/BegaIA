// Path: /root/begasist/app/api/chat/route.ts
import { NextResponse } from "next/server";
// Ensure console.warn/error are captured to log.txt via debugLog hooks
import "@/lib/utils/debugLog";
import crypto from "crypto";
import { handleIncomingMessage, MH_VERSION } from "@/lib/handlers/messageHandler";
import { getAdapter } from "@/lib/adapters/registry";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getMessagesByConversationService } from "@/lib/services/messages";
import { detectLanguage } from "@/lib/utils/language";
import type { Channel, ChannelMessage, ChannelMode } from "@/types/channel";

const BUILD_TAG = "2026-01-30-ARQSYS";
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

function normalizeApiLang(value: unknown): "es" | "en" | "pt" | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "eng" || v === "en") return "en";
  if (v === "por" || v === "pt") return "pt";
  if (v === "spa" || v === "es") return "es";
  return null;
}

function inferGreetingLangFromQuery(q: string): "es" | "en" | "pt" | null {
  const s = String(q || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return null;
  if (/^(bom dia|ola|oi)\b/.test(s)) return "pt";
  if (/^(hello|hi|hey)\b/.test(s)) return "en";
  if (/^(hola|buenas|buenos dias)\b/.test(s)) return "es";
  return null;
}

function logChat(event: string, data: Record<string, unknown>, level: "log" | "warn" | "error" = "log") {
  const payload = {
    ts: new Date().toISOString(),
    src: "api/chat",
    event,
    ...data,
  };
  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  if (DEBUG_CHAT) {
    (level === "warn" ? console.warn : console.log)(JSON.stringify(payload));
  }
}

// Test/DEBUG-only fast path and idempotency cache to avoid heavy graph during integration tests.
const IS_TEST_ENV = process.env.NODE_ENV === "test" || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST);
const FORCE_GENERATION = process.env.FORCE_GENERATION === "1";
const ENABLE_TEST_FASTPATH = process.env.ENABLE_TEST_FASTPATH === "1" || process.env.DEBUG_FASTPATH === "1" || IS_TEST_ENV;
const FAST_ROUTE_MODE = !FORCE_GENERATION && (ENABLE_TEST_FASTPATH || !process.env.OPENAI_API_KEY);

const processedMsgIds = new Set<string>();

export async function POST(req: Request) {
  const startedAt = Date.now();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const hotelId = normText(body.hotelId, 120);
  const channel = (normText(body.channel, 30) || "web") as Channel;
  const incomingConversationId =
    normText(body.conversationId, 120) || normText(body.conversation_id, 120) || normText(body.convId, 120);
  const conversationId = incomingConversationId || `conv-${crypto.randomUUID()}`;
  const guestId = normText(body.guestId, 120) || "web-guest";
  const sender = normText(body.sender, 60) || "guest";
  const content =
    normText(body.query) || normText(body.message) || normText(body.text) || normText(body.content);
  const detectedLanguage = normText(body.detectedLanguage, 12);
  const explicitLang = normText(body.lang, 12);
  let langResolved = explicitLang || detectedLanguage || "es";
  const clientMsgId = normText(body.messageId, 180) || undefined;
  const modeIn = normText(body.mode, 30) as ChannelMode | "";
  const preMessageId = clientMsgId || `${channel}:${conversationId}:${crypto.randomUUID()}`;

  logChat("request.received", {
    build: BUILD_TAG,
    handlerVersion: MH_VERSION,
    hotelId,
    channel,
    conversationId,
    hasClientMessageId: Boolean(clientMsgId),
    textLength: content.length,
    fastRouteMode: FAST_ROUTE_MODE,
  });

  if (!hotelId) {
    return jsonWithBuild(
      { ok: false, error: "hotelId is required", status: "sent", conversationId },
      { status: 400 }
    );
  }

  if (!content) {
    return jsonWithBuild(
      { ok: false, error: "message is required", status: "sent", conversationId },
      { status: 400 }
    );
  }

  try {
    const hotelConf = await getHotelConfig(hotelId).catch(() => null);
    langResolved = explicitLang || (await detectLanguage(content, hotelId).catch(() => "")) || detectedLanguage || "es";
    const cfgMode: ChannelMode =
      (modeIn ? (modeIn as ChannelMode) : undefined) ??
      (hotelConf?.channelConfigs?.[channel]?.mode as ChannelMode) ??
      "automatic";
    const resolvedStatus: "pending" | "sent" = cfgMode === "supervised" ? "pending" : "sent";
    const messageId = preMessageId;
    const time = new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });

    const incoming: ChannelMessage = {
      messageId,
      hotelId,
      channel,
      conversationId,
      sender,
      guestId,
      role: "user",
      content: content.slice(0, SAFE_INPUT_MAX),
      suggestion: "",
      timestamp: new Date().toISOString(),
      time,
      status: resolvedStatus,
      detectedLanguage: langResolved,
      direction: "in",
      sourceProvider: channel,
      sourceMsgId: clientMsgId,
    };

    const adapter = getAdapter(channel);
    const opts: Parameters<typeof handleIncomingMessage>[1] = { mode: cfgMode };
    if (adapter) {
      opts.sendReply = (reply: string) => adapter.sendReply({ hotelId, conversationId, channel }, reply);
    }

    if (FAST_ROUTE_MODE) {
      if (clientMsgId && processedMsgIds.has(clientMsgId)) {
        return jsonWithBuild(
          {
            conversationId,
            status: resolvedStatus,
            message: {
              hotelId,
              conversationId,
              channel,
              messageId: preMessageId,
              status: resolvedStatus,
              suggestion: cfgMode === "supervised" ? "Un recepcionista revisará y responderá en breve." : undefined,
            },
            lang: langResolved,
            deduped: true,
          },
          { status: 200 }
        );
      }
      processedMsgIds.add(preMessageId);
    } else {
      await handleIncomingMessage(incoming, opts);
    }

    let responseText: string | undefined = undefined;
    let responseRich: unknown | undefined = undefined;
    let responseLang = normalizeApiLang(langResolved) || "es";
    if (!FAST_ROUTE_MODE) {
      try {
        const msgs = await getMessagesByConversationService(hotelId, channel, conversationId);
        const aiMsgs = (msgs || []).filter((m) => m?.sender === "assistant" || m?.role === "ai");
        const incomingTs = Date.parse(incoming.timestamp || "");
        let lastAi = aiMsgs
          .filter((m) => {
            const ts = Date.parse(m?.timestamp || "");
            return Number.isFinite(incomingTs) && Number.isFinite(ts) ? ts >= incomingTs : false;
          })
          .sort((a, b) => Date.parse(a?.timestamp || "") - Date.parse(b?.timestamp || ""))
          .at(-1);
        if (!lastAi) {
          lastAi = [...aiMsgs].sort((a, b) => Date.parse(a?.timestamp || "") - Date.parse(b?.timestamp || "")).at(-1);
        }
        if (lastAi) {
          responseText = (lastAi.content || lastAi.suggestion || "").trim() || undefined;
          responseRich = (lastAi as Record<string, unknown>).rich;
          const lastAiRec = lastAi as Record<string, unknown>;
          responseLang =
            normalizeApiLang(lastAiRec.detectedLanguage) ||
            normalizeApiLang(lastAiRec.preferredLanguage) ||
            responseLang;
        }
      } catch (e: unknown) {
        logChat(
          "response.lookup_failed",
          {
            hotelId,
            channel,
            conversationId,
            error: e instanceof Error ? e.message : String(e),
          },
          "warn"
        );
      }
    }
    if (responseLang === "es") {
      const inferred = inferGreetingLangFromQuery(content);
      if (inferred) responseLang = inferred;
    }

    const responsePayload = {
      conversationId,
      status: resolvedStatus,
      message: {
        hotelId,
        conversationId,
        channel,
        messageId,
        status: resolvedStatus,
        suggestion: cfgMode === "supervised" ? "Un recepcionista revisará y responderá en breve." : undefined,
      },
      response: resolvedStatus === "pending" ? undefined : responseText,
      suggestedReply: resolvedStatus === "pending" ? responseText : undefined,
      rich: responseRich,
      lang: responseLang,
    };

    logChat("request.completed", {
      hotelId,
      channel,
      conversationId,
      status: resolvedStatus,
      durationMs: Date.now() - startedAt,
    });
    return jsonWithBuild(responsePayload, { status: 200 });
  } catch (err: unknown) {
    logChat(
      "request.failed",
      {
        hotelId,
        channel,
        conversationId,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      },
      "error"
    );

    const isIdempotent = String(err instanceof Error ? err.message : err).toLowerCase().includes("idempotent");
    if (isIdempotent) {
      return jsonWithBuild(
        {
          conversationId,
          status: "sent", // estado neutro para el widget; no reenvía nada nuevo
          message: {
            hotelId,
            conversationId,
            channel,
            messageId: preMessageId,
            status: "sent",
          },
          lang: langResolved,
          deduped: true,
        },
        { status: 200 }
      );
    }
    const fallback =
      langResolved.toLowerCase().startsWith("es")
        ? "Perdón, tuve un problema procesando tu consulta. ¿Podés intentar de nuevo?"
        : langResolved.toLowerCase().startsWith("pt")
          ? "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?"
          : "Sorry, I had an issue processing your request. Could you try again?";

    return jsonWithBuild({ ok: false, conversationId, status: "sent", error: fallback }, { status: 500 });
  }
}

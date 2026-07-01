// Path: /root/begasist/lib/pipeline/handleChannelMessage.ts
import crypto from "crypto";
import type { Channel, ChannelMessage, ChannelMode, MessageStatus } from "@/types/channel";

const SAFE_INPUT_MAX = 3000;
const FORCE_GENERATION = process.env.FORCE_GENERATION === "1";
const IS_TEST_ENV = process.env.NODE_ENV === "test" || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST);
const ENABLE_TEST_FASTPATH = process.env.ENABLE_TEST_FASTPATH === "1" || process.env.DEBUG_FASTPATH === "1" || IS_TEST_ENV;
const FAST_ROUTE_MODE = IS_TEST_ENV && !FORCE_GENERATION && ENABLE_TEST_FASTPATH;
const DEBUG_EMAIL_ACTOR_CAPTURE = process.env.DEBUG_EMAIL_ACTOR_CAPTURE === "1";

const processedMsgIds = new Set<string>();

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

class ChannelMessageInputError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ChannelMessageInputError";
  }
}

export async function handleChannelMessage(input: {
  query: string;
  channel: import("@/types/channel").Channel;
  hotelId?: string;
  lang?: string;
  conversationId?: string;
  userId?: string;
  guestId?: string;
  sourceMsgId?: string;
  mode?: ChannelMode;
  sender?: string;
  subject?: string;
  recipient?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
  references?: string[];
  inReplyTo?: string;
  originalMessageId?: string;
  isForwarded?: boolean;
  meta?: Record<string, any>;
  sourceProvider?: string;
}): Promise<{
  response: string;
  status: import("@/types/channel").MessageStatus;
  messageId: string;
  conversationId: string;
  lang: string;
  suggestedReply?: string;
  rich?: unknown;
  deduped?: boolean;
  hotelId?: string;
  channel?: Channel;
}> {
  const [
    { handleIncomingMessage, extractExplicitConversationalActorName },
    { getAdapter },
    { getHotelConfig },
    { getMessagesByConversationService },
    { detectLanguage },
    { resolveGuestIdentity },
    conversationsDb,
    guestsDb,
  ] =
    await Promise.all([
      import("@/lib/handlers/messageHandler"),
      import("@/lib/adapters/registry"),
      import("@/lib/config/hotelConfig.server"),
      import("@/lib/services/messages"),
      import("@/lib/utils/language"),
      import("@/lib/pipeline/resolveGuestIdentity"),
      import("@/lib/db/conversations"),
      import("@/lib/db/guests"),
    ]);
  const hotelId = normText(input.hotelId, 120);
  const channel = (normText(input.channel, 30) || "web") as Channel;
  const explicitConversationId = normText(input.conversationId, 120);
  const rawGuestId = normText(input.guestId, 120) || "web-guest";
  const sender = normText(input.sender, 180) || "guest";
  const content = normText(input.query);
  const explicitLang = normText(input.lang, 12);
  const modeIn = normText(input.mode, 30) as ChannelMode | "";
  const sourceMsgId = normText(input.sourceMsgId, 180) || undefined;

  if (!hotelId) throw new ChannelMessageInputError("hotelId is required");
  if (!content) throw new ChannelMessageInputError("message is required");

  const resolvedIdentity = await resolveGuestIdentity({
    hotelId,
    channel,
    rawGuestId,
  });
  const guestId = normText(resolvedIdentity.guestId, 120) || rawGuestId;
  if (DEBUG_EMAIL_ACTOR_CAPTURE && channel === "email") {
    console.info("[EMAIL_ACTOR_CAPTURE]", {
      stage: "email_actor_capture",
      phase: "resolved_identity",
      hotelId,
      channel,
      resolvedGuestId: guestId,
      incomingGuestId: rawGuestId,
      senderIdentity: sender,
      contentPreview: content.slice(0, 240),
      extractedActorName: null,
      derivedFirstName: null,
      updateGuestCalled: false,
      updateGuestPatch: null,
      updateGuestResult_or_error: null,
    });
  }
  let conversationId = explicitConversationId;
  if (!conversationId && guestId) {
    const existingConversation = await conversationsDb.findActiveConversationByGuestId({
      hotelId,
      guestId,
      channel,
    });
    conversationId = normText(existingConversation?.conversationId, 120);
  }
  if (!conversationId) {
    conversationId = `conv-${crypto.randomUUID()}`;
  }
  const preMessageId = sourceMsgId || `${channel}:${conversationId}:${crypto.randomUUID()}`;

  let langResolved = explicitLang || "es";

  const hotelConf = await getHotelConfig(hotelId).catch(() => null);
  langResolved = explicitLang || (await detectLanguage(content, hotelId).catch(() => "")) || "es";

  const cfgMode: ChannelMode =
    (modeIn ? (modeIn as ChannelMode) : undefined) ??
    (hotelConf?.channelConfigs?.[channel]?.mode as ChannelMode) ??
    "automatic";

  const resolvedStatus: MessageStatus = cfgMode === "supervised" ? "pending" : "sent";
  let outputStatus: MessageStatus = resolvedStatus;
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
    sourceProvider: normText(input.sourceProvider, 60) || channel,
    sourceMsgId,
    subject: normText(input.subject, 240) || undefined,
    recipient: normText(input.recipient, 240) || undefined,
    cc: Array.isArray(input.cc) ? input.cc : undefined,
    bcc: Array.isArray(input.bcc) ? input.bcc : undefined,
    attachments: Array.isArray(input.attachments) ? input.attachments : undefined,
    references: Array.isArray(input.references) ? input.references : undefined,
    inReplyTo: normText(input.inReplyTo, 240) || undefined,
    originalMessageId: normText(input.originalMessageId, 240) || undefined,
    isForwarded: typeof input.isForwarded === "boolean" ? input.isForwarded : undefined,
    meta: input.meta,
  };

  if (channel === "email") {
    const explicitConversationalActor = extractExplicitConversationalActorName(content);
    const firstName = explicitConversationalActor
      ? explicitConversationalActor.split(/\s+/)[0] || explicitConversationalActor
      : null;
    const updateGuestPatch = explicitConversationalActor
      ? { name: explicitConversationalActor, firstName: firstName || explicitConversationalActor }
      : null;
    if (DEBUG_EMAIL_ACTOR_CAPTURE) {
      console.info("[EMAIL_ACTOR_CAPTURE]", {
        stage: "email_actor_capture",
        phase: "before_update",
        hotelId,
        channel,
        resolvedGuestId: guestId,
        incomingGuestId: rawGuestId,
        senderIdentity: sender,
        contentPreview: content.slice(0, 240),
        extractedActorName: explicitConversationalActor || null,
        derivedFirstName: firstName,
        updateGuestCalled: Boolean(explicitConversationalActor),
        updateGuestPatch,
        updateGuestResult_or_error: null,
      });
    }
    if (explicitConversationalActor) {
      try {
        await guestsDb.updateGuest(hotelId, guestId, updateGuestPatch!);
        if (DEBUG_EMAIL_ACTOR_CAPTURE) {
          console.info("[EMAIL_ACTOR_CAPTURE]", {
            stage: "email_actor_capture",
            phase: "after_update",
            hotelId,
            channel,
            resolvedGuestId: guestId,
            incomingGuestId: rawGuestId,
            senderIdentity: sender,
            contentPreview: content.slice(0, 240),
            extractedActorName: explicitConversationalActor,
            derivedFirstName: firstName,
            updateGuestCalled: true,
            updateGuestPatch,
            updateGuestResult_or_error: "success",
          });
        }
      } catch (error) {
        if (DEBUG_EMAIL_ACTOR_CAPTURE) {
          console.error("[EMAIL_ACTOR_CAPTURE]", {
            stage: "email_actor_capture",
            phase: "update_error",
            hotelId,
            channel,
            resolvedGuestId: guestId,
            incomingGuestId: rawGuestId,
            senderIdentity: sender,
            contentPreview: content.slice(0, 240),
            extractedActorName: explicitConversationalActor,
            derivedFirstName: firstName,
            updateGuestCalled: true,
            updateGuestPatch,
            updateGuestResult_or_error: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }
    }
  }

  const adapter = getAdapter(channel);
  const opts: Parameters<typeof handleIncomingMessage>[1] = { mode: cfgMode };
  if (adapter) {
    opts.sendReply = (reply: string) => adapter.sendReply({ hotelId, conversationId, channel }, reply);
  }

  async function persistConversationBinding() {
    const getOrCreateConversation =
      "getOrCreateConversation" in conversationsDb ? (conversationsDb as any).getOrCreateConversation : undefined;
    const updateConversation =
      "updateConversation" in conversationsDb ? (conversationsDb as any).updateConversation : undefined;

    if (typeof getOrCreateConversation === "function") {
      await getOrCreateConversation({
        conversationId,
        hotelId,
        channel,
        guestId,
        startedAt: incoming.timestamp,
        lastUpdatedAt: incoming.timestamp,
        lang: langResolved,
        status: "active",
        subject: "",
      });
    }

    if (typeof updateConversation === "function") {
      await updateConversation(conversationId, {
        guestId,
        channel,
        hotelId,
        lastUpdatedAt: incoming.timestamp,
      } as any);
    }
  }

  if (FAST_ROUTE_MODE) {
    if (sourceMsgId && processedMsgIds.has(sourceMsgId)) {
      return {
        response: "",
        status: resolvedStatus,
        messageId: preMessageId,
        conversationId,
        lang: langResolved,
        suggestedReply: cfgMode === "supervised" ? "Un recepcionista revisará y responderá en breve." : undefined,
        deduped: true,
        hotelId,
        channel,
      };
    }
    processedMsgIds.add(preMessageId);
    await persistConversationBinding();
  } else {
    await handleIncomingMessage(incoming, opts);
    await persistConversationBinding();
  }

  let responseText: string | undefined;
  let responseRich: unknown | undefined;
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
        const lastStatus = (lastAi as Record<string, unknown>).status;
        if (typeof lastStatus === "string") {
          outputStatus = lastStatus as MessageStatus;
        }
        const lastAiRec = lastAi as Record<string, unknown>;
        responseLang =
          normalizeApiLang(lastAiRec.detectedLanguage) ||
          normalizeApiLang(lastAiRec.preferredLanguage) ||
          responseLang;
      }
    } catch {
      // getMessagesByConversationService already falls back to channelMemory
    }
  }

  if (responseLang === "es") {
    const inferred = inferGreetingLangFromQuery(content);
    if (inferred) responseLang = inferred;
  }

  return {
    response: outputStatus === "pending" ? "" : (responseText || ""),
    suggestedReply: outputStatus === "pending" ? responseText : undefined,
    rich: responseRich,
    status: outputStatus,
    messageId,
    conversationId,
    lang: responseLang,
    hotelId,
    channel,
  };
}

export { ChannelMessageInputError };

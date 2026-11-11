// Path: /root/begasist/lib/pipeline/handleChannelMessage.ts
import crypto from "crypto";
import type { Channel, ChannelMessage, ChannelMode, MessageStatus } from "@/types/channel";
import {
  acquireConversationOwnership,
  assertConversationOwnership,
  createConversationWriterGuard,
  releaseConversationOwnership,
} from "@/lib/db/convState";
import {
  getConversationOwnershipContext,
  runWithConversationOwnership,
} from "@/lib/ownership/conversationOwnershipContext";

const SAFE_INPUT_MAX = 3000;
const FORCE_GENERATION = process.env.FORCE_GENERATION === "1";
const IS_TEST_ENV = process.env.NODE_ENV === "test" || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST);
const ENABLE_TEST_FASTPATH = process.env.ENABLE_TEST_FASTPATH === "1" || process.env.DEBUG_FASTPATH === "1" || IS_TEST_ENV;
const FAST_ROUTE_MODE = IS_TEST_ENV && !FORCE_GENERATION && ENABLE_TEST_FASTPATH;
const DEBUG_EMAIL_ACTOR_CAPTURE = process.env.DEBUG_EMAIL_ACTOR_CAPTURE === "1";
const COMMON_CHANNEL_WRITER_KIND = "common_channel_turn";
const COMMON_CHANNEL_WRITER_INSTANCE_ID = `process-${process.pid}-${crypto.randomUUID()}`;
const COMMON_CHANNEL_WRITER_BUILD_ID = [
  process.env.BEGASIST_BUILD_ID,
  process.env.VERCEL_GIT_COMMIT_SHA,
  process.env.GIT_COMMIT_SHA,
  process.env.npm_package_version,
].find((value) => typeof value === "string" && value.length > 0 && value.trim() === value) || "unversioned-build";

const processedMsgIds = new Set<string>();

export const CHANNEL_TURN_RESULT_CONTRACT_VERSION = "channel-turn-result-v1" as const;

export type ChannelTurnResultContract = Readonly<{
  contractVersion: typeof CHANNEL_TURN_RESULT_CONTRACT_VERSION;
  outcome: "rejected" | "failed" | "completed_reconciliation_required";
  inboundPersistence: "not_attempted" | "uncertain" | "persisted";
  ownership:
    | "not_started"
    | "occupied"
    | "acquisition_uncertain"
    | "acquisition_error"
    | "lost"
    | "released"
    | "release_not_owner"
    | "release_uncertain"
    | "release_error";
  retry: "retry_later" | "do_not_retry" | "reconcile_before_retry";
  reconciliationRequired: boolean;
  reason: string;
}>;

function channelTurnResult(
  result: Omit<ChannelTurnResultContract, "contractVersion">,
): ChannelTurnResultContract {
  return Object.freeze({
    contractVersion: CHANNEL_TURN_RESULT_CONTRACT_VERSION,
    ...result,
  });
}

function normText(value: unknown, max = SAFE_INPUT_MAX): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function requireCanonicalIdentity(
  value: unknown,
  field: "hotelId" | "conversationId",
  options: { forbidColon?: boolean } = {},
): string {
  if (typeof value !== "string" || !value || value.trim() !== value || value.length > 120) {
    throw new ChannelMessageInputError(`${field} must be a canonical non-empty string`);
  }
  if (options.forbidColon && value.includes(":")) {
    throw new ChannelMessageInputError(`${field} cannot contain ':' because it prefixes the canonical conversation key`);
  }
  return value;
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
  readonly channelTurnResult: ChannelTurnResultContract;
  constructor(message: string) {
    super(message);
    this.name = "ChannelMessageInputError";
    this.channelTurnResult = channelTurnResult({
      outcome: "rejected",
      inboundPersistence: "not_attempted",
      ownership: "not_started",
      retry: "do_not_retry",
      reconciliationRequired: false,
      reason: "invalid_input",
    });
  }
}

class ChannelTurnOwnershipError extends Error {
  readonly status: number;
  readonly ownershipStatus: string;
  readonly retryable: boolean;
  readonly channelTurnResult: ChannelTurnResultContract;

  constructor(
    ownershipStatus: string,
    reason: string,
    result: ChannelTurnResultContract,
  ) {
    super(`conversation ownership ${ownershipStatus}: ${reason}`);
    this.name = "ChannelTurnOwnershipError";
    this.ownershipStatus = ownershipStatus;
    this.status = ownershipStatus === "occupied" ? 409 : 503;
    this.retryable = result.retry === "retry_later";
    this.channelTurnResult = result;
  }
}

class ChannelTurnProcessingError extends Error {
  readonly status = 503;
  readonly retryable = false;
  readonly channelTurnResult: ChannelTurnResultContract;

  constructor(message: string, result: ChannelTurnResultContract, cause: unknown) {
    super(message, { cause });
    this.name = "ChannelTurnProcessingError";
    this.channelTurnResult = result;
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
  ownershipRelease?: {
    status: "not_owner" | "uncertain" | "error";
    reason?: string;
  };
  channelTurnResult?: ChannelTurnResultContract;
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
  const hotelId = requireCanonicalIdentity(input.hotelId, "hotelId", { forbidColon: true });
  const channel = (normText(input.channel, 30) || "web") as Channel;
  const explicitConversationId = input.conversationId == null
    ? ""
    : requireCanonicalIdentity(input.conversationId, "conversationId");
  const rawGuestId = normText(input.guestId, 120) || "web-guest";
  const sender = normText(input.sender, 180) || "guest";
  const content = normText(input.query);
  const explicitLang = normText(input.lang, 12);
  const modeIn = normText(input.mode, 30) as ChannelMode | "";
  const sourceMsgId = normText(input.sourceMsgId, 180) || undefined;

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
    if (existingConversation?.conversationId != null) {
      conversationId = requireCanonicalIdentity(existingConversation.conversationId, "conversationId");
    }
  }
  if (!conversationId) {
    conversationId = `conv-${crypto.randomUUID()}`;
  }
  conversationId = requireCanonicalIdentity(conversationId, "conversationId");
  const preMessageId = sourceMsgId || `${channel}:${conversationId}:${crypto.randomUUID()}`;
  let inboundPersistence: ChannelTurnResultContract["inboundPersistence"] = "not_attempted";

  const executeResolvedTurn = async () => {

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
      await updateConversation(hotelId, conversationId, {
        guestId,
        channel,
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
    inboundPersistence = "uncertain";
    await persistConversationBinding();
    inboundPersistence = "persisted";
  } else {
    inboundPersistence = "uncertain";
    await handleIncomingMessage(incoming, opts);
    inboundPersistence = "persisted";
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
  };

  const inheritedOwnership = getConversationOwnershipContext();
  if (inheritedOwnership) {
    if (inheritedOwnership.hotelId !== hotelId || inheritedOwnership.conversationId !== conversationId) {
      throw new ChannelTurnOwnershipError(
        "lost",
        "nested turn targets a different conversation identity",
        channelTurnResult({
          outcome: "rejected",
          inboundPersistence: "not_attempted",
          ownership: "lost",
          retry: "do_not_retry",
          reconciliationRequired: false,
          reason: "nested_identity_mismatch",
        }),
      );
    }
    const inheritedAssertion = await assertConversationOwnership(
      hotelId,
      conversationId,
      inheritedOwnership.guard,
    );
    if (inheritedAssertion.status !== "owned") {
      throw new ChannelTurnOwnershipError(
        "lost",
        inheritedAssertion.status === "uncertain" || inheritedAssertion.status === "error" || inheritedAssertion.status === "malformed"
          ? inheritedAssertion.reason
          : inheritedAssertion.status,
        channelTurnResult({
          outcome: "rejected",
          inboundPersistence: "not_attempted",
          ownership: "lost",
          retry: "reconcile_before_retry",
          reconciliationRequired: true,
          reason: `inherited_ownership_${inheritedAssertion.status}`,
        }),
      );
    }
    return runWithConversationOwnership(inheritedOwnership, executeResolvedTurn);
  }

  const attemptedGuard = createConversationWriterGuard({
    operationId: `channel-turn-${crypto.randomUUID()}`,
    writerKind: COMMON_CHANNEL_WRITER_KIND,
    instanceId: COMMON_CHANNEL_WRITER_INSTANCE_ID,
    buildId: COMMON_CHANNEL_WRITER_BUILD_ID,
    messageId: preMessageId,
  });
  const acquisition = await acquireConversationOwnership(hotelId, conversationId, attemptedGuard);
  if (acquisition.status !== "acquired") {
    const isOccupied = acquisition.status === "occupied";
    const isUncertain = acquisition.status === "uncertain";
    throw new ChannelTurnOwnershipError(
      acquisition.status,
      isOccupied ? "conversation is owned by another writer" : acquisition.reason,
      channelTurnResult({
        outcome: "rejected",
        inboundPersistence: "not_attempted",
        ownership: isOccupied ? "occupied" : isUncertain ? "acquisition_uncertain" : "acquisition_error",
        retry: isOccupied ? "retry_later" : isUncertain ? "reconcile_before_retry" : "do_not_retry",
        reconciliationRequired: isUncertain,
        reason: isOccupied ? "owned_by_another_writer" : acquisition.reason,
      }),
    );
  }

  let turnResult: Awaited<ReturnType<typeof executeResolvedTurn>> | undefined;
  let turnError: unknown;
  let releaseFailure: { status: "not_owner" | "uncertain" | "error"; reason?: string } | undefined;
  try {
    const assertion = await assertConversationOwnership(hotelId, conversationId, acquisition.guard);
    if (assertion.status !== "owned") {
      throw new ChannelTurnOwnershipError(
        "lost",
        assertion.status === "uncertain" || assertion.status === "error" || assertion.status === "malformed"
          ? assertion.reason
          : assertion.status,
        channelTurnResult({
          outcome: "rejected",
          inboundPersistence: "not_attempted",
          ownership: "lost",
          retry: "reconcile_before_retry",
          reconciliationRequired: true,
          reason: `ownership_assertion_${assertion.status}`,
        }),
      );
    }
    turnResult = await runWithConversationOwnership(
      { hotelId, conversationId, guard: acquisition.guard },
      executeResolvedTurn,
    );
  } catch (error) {
    turnError = error;
  } finally {
    try {
      const release = await releaseConversationOwnership(hotelId, conversationId, acquisition.guard);
      if (release.status !== "released") {
        releaseFailure = {
          status: release.status,
          ...(release.status === "uncertain" || release.status === "error" ? { reason: release.reason } : {}),
        };
      }
    } catch {
      releaseFailure = { status: "uncertain", reason: "release_exception" };
    }
    if (turnError && releaseFailure) {
      console.error("[conversation-ownership] turn failed and ownership release was not verified", {
        hotelId,
        conversationId,
        releaseStatus: releaseFailure.status,
        releaseReason: releaseFailure.reason,
      });
    }
  }

  if (turnError) {
    if (releaseFailure) {
      throw new ChannelTurnProcessingError(
        "conversation turn failed and ownership release was not verified",
        channelTurnResult({
          outcome: "failed",
          inboundPersistence,
          ownership: releaseFailure.status === "not_owner"
            ? "release_not_owner"
            : releaseFailure.status === "uncertain"
              ? "release_uncertain"
              : "release_error",
          retry: "reconcile_before_retry",
          reconciliationRequired: true,
          reason: releaseFailure.reason || releaseFailure.status,
        }),
        turnError,
      );
    }
    if (turnError instanceof ChannelTurnOwnershipError || turnError instanceof ChannelMessageInputError) {
      throw turnError;
    }
    throw new ChannelTurnProcessingError(
      "conversation turn failed",
      channelTurnResult({
        outcome: "failed",
        inboundPersistence,
        ownership: "released",
        retry: inboundPersistence === "not_attempted" ? "do_not_retry" : "reconcile_before_retry",
        reconciliationRequired: inboundPersistence !== "not_attempted",
        reason: inboundPersistence === "not_attempted" ? "turn_error_before_persistence" : "turn_error_after_persistence_started",
      }),
      turnError,
    );
  }

  if (!turnResult) {
    throw new ChannelTurnProcessingError(
      "protected turn produced no result",
      channelTurnResult({
        outcome: "failed",
        inboundPersistence,
        ownership: "released",
        retry: "reconcile_before_retry",
        reconciliationRequired: true,
        reason: "missing_turn_result",
      }),
      undefined,
    );
  }
  return releaseFailure
    ? {
      ...turnResult,
      ownershipRelease: releaseFailure,
      channelTurnResult: channelTurnResult({
        outcome: "completed_reconciliation_required",
        inboundPersistence: "persisted",
        ownership: releaseFailure.status === "not_owner"
          ? "release_not_owner"
          : releaseFailure.status === "uncertain"
            ? "release_uncertain"
            : "release_error",
        retry: "reconcile_before_retry",
        reconciliationRequired: true,
        reason: releaseFailure.reason || releaseFailure.status,
      }),
    }
    : turnResult;
}

export { ChannelMessageInputError, ChannelTurnOwnershipError, ChannelTurnProcessingError };

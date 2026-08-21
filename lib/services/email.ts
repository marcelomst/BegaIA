// Path: /root/begasist/lib/services/email.ts
import { simpleParser } from "mailparser";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import { flattenParts } from "@/lib/utils/emailParts";
import { parseEmailToChannelMessage } from "@/lib/parsers/emailParser";
import { handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { EmailConfig } from "@/types/channel";
import { resolveEmailCredentials, EMAIL_SENDING_ENABLED, emailSecretEnvVarName } from "@/lib/email/resolveEmailCredentials";
import { standardCleanup } from "@/lib/utils/emailCleanup";
import { disableEmailPolling } from "@/lib/services/emailPollControl";
import { getEmailPollingState, setEmailPollingState } from "@/lib/services/emailPollingState"; // ✅ path absoluto correcto
import { getMessageByOriginalIdScoped } from "@/lib/db/messages"; // Idempotencia
import { clearGuard, guardInboundOnce } from "@/lib/db/messageGuards";
import { debugLog } from "@/lib/utils/debugLog";
import { redis } from "@/lib/services/redis";
import { startChannelHeartbeat, stopChannelHeartbeat } from "@/lib/services/heartbeat";

const MAX_UID_ERRORS = 3;
const EMAIL_LOOP_INTERVAL_MS = 15000;
const EMAIL_BOT_LOCK_TTL_SEC = 120;
const EMAIL_PROCESSED_KEYWORD = "RAGBOT_PROCESSED";
const EMAIL_LEGACY_SAFE_MODE_DEFAULT = process.env.EMAIL_LEGACY_SAFE_MODE !== "0";
const EMAIL_LEGACY_LOOKBACK_DAYS_DEFAULT = Math.max(0, Number(process.env.EMAIL_LEGACY_LOOKBACK_DAYS ?? 1) || 1);
const EMAIL_LEGACY_MAX_MESSAGES_DEFAULT = Math.max(1, Number(process.env.EMAIL_LEGACY_MAX_MESSAGES ?? 10) || 10);
const failedUids: Record<number, number> = {};
type EmailWorkerMode = "once" | "watch";
type EmailBotStartup = {
  lockToken: string;
  cancelled: boolean;
};
const emailBotRuntimes = new Map<string, {
  hotelId: string;
  lockToken: string;
  intervalId: ReturnType<typeof setInterval> | null;
  connection: any;
  stopping: boolean;
}>();
// Locks acquired before IMAP finishes connecting must also be released on shutdown.
const emailBotStartingLocks = new Map<string, EmailBotStartup>();
const RELEASE_EMAIL_BOT_LOCK_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
`;

/**
 * Determina si un email es irrelevante para el RAGbot (spam, promo, newsletter, etc.)
 * Filtra por subject, from y contenido (text, html).
 */
function isIrrelevantEmail({
  subject = "",
  from = "",
  text = "",
  html = "",
}: { subject?: string; from?: string; text?: string; html?: string }) {
  const spamWords = [
    "oferta", "promo", "promoción", "newsletter", "marketing", "advertising",
    "publicidad", "descuento", "haz clic", "ver todo", "desuscríbete", "unsubscribe",
    "gestiona tu suscripción", "suscribete", "mailup", "mailchimp", "ganaste",
    "prueba gratis", "free trial", "auto-reply", "mailer-daemon", "este mensaje es automático"
  ];
  const spamFrom = [
    "@news.", "@promo.", "@marketing.", "no-reply", "noreply", "mailer-daemon", "mailup", "mailchimp", "newsletter"
  ];
  const allFields = [subject, from, text, html].map(f => (f || "").toLowerCase());
  return (
    spamWords.some(word => allFields.some(field => field.includes(word))) ||
    spamFrom.some(mask => (from || "").toLowerCase().includes(mask))
  );
}

type EmailLegacyContainmentConfig = {
  safeMode: boolean;
  lookbackDays: number;
  maxMessages: number;
  allowedSenders: string[];
};

function normalizeEmailAddress(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function formatImapDate(date: Date): string {
  const day = date.getUTCDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export function getEmailLegacyContainmentConfig(): EmailLegacyContainmentConfig {
  const allowedSenders = String(process.env.EMAIL_LEGACY_ALLOWED_SENDERS ?? "")
    .split(",")
    .map((item) => normalizeEmailAddress(item))
    .filter(Boolean);

  return {
    safeMode: EMAIL_LEGACY_SAFE_MODE_DEFAULT,
    lookbackDays: EMAIL_LEGACY_LOOKBACK_DAYS_DEFAULT,
    maxMessages: EMAIL_LEGACY_MAX_MESSAGES_DEFAULT,
    allowedSenders,
  };
}

export function buildEmailLegacySearchCriteria(now = new Date(), cfg = getEmailLegacyContainmentConfig()): any[] {
  const criteria: any[] = ["UNSEEN", ["UNKEYWORD", EMAIL_PROCESSED_KEYWORD]];
  if (cfg.safeMode && cfg.lookbackDays > 0) {
    const since = new Date(now.getTime() - cfg.lookbackDays * 24 * 60 * 60 * 1000);
    criteria.push(["SINCE", formatImapDate(since)]);
  }
  return criteria;
}

export function limitLegacyMessages(messages: any[], cfg: EmailLegacyContainmentConfig): any[] {
  if (!cfg.safeMode || messages.length <= cfg.maxMessages) return messages;
  return [...messages]
    .sort((a, b) => Number(b?.attributes?.uid || 0) - Number(a?.attributes?.uid || 0))
    .slice(0, cfg.maxMessages)
    .sort((a, b) => Number(a?.attributes?.uid || 0) - Number(b?.attributes?.uid || 0));
}

function shouldProcessLegacySender(senderEmail: string, cfg: EmailLegacyContainmentConfig): boolean {
  if (!cfg.allowedSenders.length) return true;
  return cfg.allowedSenders.includes(normalizeEmailAddress(senderEmail));
}

function buildEmailBotLockKey(hotelId: string): string {
  return `email_bot_lock:${hotelId}`;
}

export function getEmailWorkerMode(): EmailWorkerMode {
  const raw = String(process.env.EMAIL_WORKER_MODE ?? "").trim().toLowerCase();
  if (raw === "watch" || raw === "daemon" || raw === "continuous") return "watch";
  return "once";
}

export function shouldKeepEmailRuntimeAliveAfterBatch(mode = getEmailWorkerMode()): boolean {
  return mode === "watch";
}

export function shouldAutoEnableEmailPollingOnStartup(
  mode = getEmailWorkerMode(),
  emailEnabled = true,
): boolean {
  return mode === "watch" && emailEnabled !== false;
}

function newEmailBotLockToken(hotelId: string): string {
  return `${hotelId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export async function acquireEmailBotLock(hotelId: string, lockToken: string): Promise<boolean> {
  const key = buildEmailBotLockKey(hotelId);
  const result = await redis.set(key, lockToken, "EX", EMAIL_BOT_LOCK_TTL_SEC, "NX");
  return result === "OK";
}

export async function refreshEmailBotLock(hotelId: string, lockToken: string): Promise<boolean> {
  const key = buildEmailBotLockKey(hotelId);
  const current = await redis.get(key);
  if (current !== lockToken) return false;
  await redis.set(key, lockToken, "EX", EMAIL_BOT_LOCK_TTL_SEC);
  return true;
}

async function isEmailBotLockOwner(hotelId: string, lockToken: string): Promise<boolean> {
  const key = buildEmailBotLockKey(hotelId);
  return (await redis.get(key)) === lockToken;
}

export async function releaseEmailBotLock(hotelId: string, lockToken: string): Promise<boolean> {
  const key = buildEmailBotLockKey(hotelId);
  const result = await redis.eval(RELEASE_EMAIL_BOT_LOCK_SCRIPT, 1, key, lockToken);
  return Number(result) === 1;
}

function isUnsupportedImapKeywordError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || "").toLowerCase();
  const mentionsProcessedKeyword = msg.includes(EMAIL_PROCESSED_KEYWORD.toLowerCase());
  if (!mentionsProcessedKeyword) return false;
  return (
    msg.includes("unable to parse flag") ||
    msg.includes("unsupported") ||
    msg.includes("not supported") ||
    msg.includes("invalid flag") ||
    msg.includes("invalid keyword")
  );
}

export async function markEmailProcessed(connection: any, uid: number): Promise<void> {
  try {
    await connection.addFlags(uid, ["\\Seen", EMAIL_PROCESSED_KEYWORD]);
    return;
  } catch {
    await connection.addFlags(uid, "\\Seen");
  }

  try {
    await connection.addFlags(uid, EMAIL_PROCESSED_KEYWORD);
  } catch (err) {
    if (isUnsupportedImapKeywordError(err)) {
      console.warn(`[email] Keyword IMAP no soportada para UID ${uid}. Se conserva fallback con \\Seen.`);
      return;
    }
    throw err;
  }
}

async function closeEmailConnection(connection: any): Promise<void> {
  try {
    await connection?.end?.();
  } catch {
    try {
      connection?.imap?.end?.();
    } catch {
      // best effort
    }
  }
}

async function stopEmailBotRuntime(hotelId: string, reason: string, lockToken: string) {
  const runtime = emailBotRuntimes.get(hotelId);
  if (!runtime || runtime.lockToken !== lockToken) return;

  runtime.stopping = true;
  if (runtime.intervalId) {
    clearInterval(runtime.intervalId);
    runtime.intervalId = null;
  }

  await closeEmailConnection(runtime.connection);

  emailBotRuntimes.delete(hotelId);
  stopChannelHeartbeat("email", hotelId);
  await releaseEmailBotLock(hotelId, lockToken).catch((err) => {
    console.warn(`[email] No se pudo liberar lock (${hotelId}) tras ${reason}:`, err);
  });
  console.log(`[email] Runtime detenido para hotel ${hotelId}. reason=${reason}`);
}

export async function stopAllEmailBotRuntimes(reason: string): Promise<void> {
  const startingLocks = [...emailBotStartingLocks.entries()];
  for (const [, startup] of startingLocks) {
    startup.cancelled = true;
  }

  const runtimes = [...emailBotRuntimes.values()];
  await Promise.all(runtimes.map((runtime) => (
    stopEmailBotRuntime(runtime.hotelId, reason, runtime.lockToken)
  )));

  await Promise.all(startingLocks.map(async ([hotelId, startup]) => {
    if (emailBotStartingLocks.get(hotelId) !== startup) return;
    await releaseEmailBotLock(hotelId, startup.lockToken).catch((err) => {
      console.warn(`[email] No se pudo liberar lock de arranque (${hotelId}) tras ${reason}:`, err);
    });
  }));
}

async function shouldContinueEmailProcessing(hotelId: string, lockToken: string): Promise<boolean> {
  const runtime = emailBotRuntimes.get(hotelId);
  if (!runtime || runtime.lockToken !== lockToken || runtime.stopping) return false;

  const enabled = await getEmailPollingState(hotelId);
  if (!enabled) return false;

  return refreshEmailBotLock(hotelId, lockToken);
}

export async function processInboundEmailMessage(args: {
  hotelId: string;
  parsed: any;
  raw?: Buffer | string;
  mode: "automatic" | "supervised";
  emailUser: string;
  sendReply: (input: { to: string; subject: string; text: string }) => Promise<void>;
}) {
  const { hotelId, parsed, raw, mode, emailUser, sendReply } = args;

  const channelMsg = await parseEmailToChannelMessage({
    parsed,
    hotelId,
    raw,
  });

  let originalMessageId =
    parsed.messageId || channelMsg.originalMessageId || channelMsg.messageId;
  if (!originalMessageId) {
    debugLog(`⚠️ [email] No se encontró messageId en el email, generando uno por hash...`);
    let hashVal = "";
    try {
      const base = [
        parsed.from?.text, parsed.subject, parsed.date, parsed.text, parsed.html
      ].filter(Boolean).join("|");
      // @ts-ignore
      const crypto = typeof require !== "undefined" ? require("crypto") : null;
      hashVal = crypto
        ? crypto.createHash("sha256").update(base).digest("hex")
        : base;
    } catch {
      hashVal = Math.random().toString(36).slice(2, 12);
    }
    originalMessageId = hashVal;
  }
  channelMsg.originalMessageId = originalMessageId;
  const senderEmail = String(channelMsg.sender || "").trim().toLowerCase();
  const inboundDedupeKey = channelMsg.originalMessageId ?? channelMsg.messageId;
  const inboundGuardConversationId =
    String(channelMsg.conversationId || `${hotelId}:email:${senderEmail || "guest"}`).trim();

  const inboundGuard = await guardInboundOnce({
    hotelId,
    conversationId: inboundGuardConversationId,
    sourceMsgId: inboundDedupeKey,
  });
  if (!inboundGuard.applied) {
    console.log(`[email] 🔁 dedupe inbound/reply → ignorado ${inboundDedupeKey}`);
    return { deduped: true as const, channelMsg };
  }

  const IGNORE_IDEMPOTENCY = process.env.EMAIL_BOT_IGNORE_IDEMPOTENCY === "true";
  if (!IGNORE_IDEMPOTENCY) {
    const alreadyExists = await getMessageByOriginalIdScoped(hotelId, channelMsg.originalMessageId!);
    if (alreadyExists) {
      console.log(`[email] Mensaje duplicado detectado, no se guarda:`, channelMsg.originalMessageId);
      return { deduped: true as const, channelMsg };
    }
  }

  const rawText = channelMsg.content || "";
  const cleaned = standardCleanup(rawText);
  channelMsg.content = cleaned;
  channelMsg.suggestion = channelMsg.suggestion ?? "";
  console.log(`🧹 [email] Texto limpiado:`, cleaned);
  try {
    const result = await handleChannelMessage({
      query: cleaned,
      hotelId,
      channel: "email",
      guestId: senderEmail,
      sender: senderEmail || "guest",
      sourceMsgId: inboundDedupeKey,
      mode,
      subject: channelMsg.subject,
      recipient: channelMsg.recipient,
      cc: channelMsg.cc,
      bcc: channelMsg.bcc,
      attachments: channelMsg.attachments,
      references: channelMsg.references,
      inReplyTo: channelMsg.inReplyTo,
      originalMessageId: channelMsg.originalMessageId,
      isForwarded: channelMsg.isForwarded,
      sourceProvider: "email",
      meta: {
        ...(channelMsg.meta || {}),
        emailFrom: senderEmail || undefined,
        emailTo: channelMsg.recipient || undefined,
      },
    });

    if (result.status === "sent" && result.response.trim()) {
      await sendReply({
        to: senderEmail || parsed.from?.text || emailUser,
        subject: "Re: " + (channelMsg.subject || parsed.subject || ""),
        text: result.response,
      });
      console.log(`📤 [email] Respuesta enviada a ${senderEmail || parsed.from?.text}`);
    }

    return { deduped: false as const, channelMsg, result };
  } catch (err) {
    await clearGuard(hotelId, inboundGuardConversationId, inboundDedupeKey, "in").catch(() => {});
    throw err;
  }
}

export async function startEmailBot({
  hotelId,
  emailConf,
}: {
  hotelId: string;
  emailConf: EmailConfig;
}) {
  console.log("📥 [email] Iniciando bot de correo...");
  const existingRuntime = emailBotRuntimes.get(hotelId);
  if (existingRuntime && !existingRuntime.stopping) {
    console.warn(`[email] Ya existe un runtime activo para hotelId=${hotelId}. No se inicia otro.`);
    return;
  }
  let lockToken: string | null = null;

  try {
    const {
      dirEmail: EMAIL_USER,
      imapHost: IMAP_HOST,
      imapPort: IMAP_PORT,
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      secure: EMAIL_SECURE = false,
      secretRef,
      password: inlinePassword,
    } = emailConf as any;

    if (!EMAIL_USER || !IMAP_HOST || !SMTP_HOST) {
      throw new Error("❌ Faltan datos críticos de email (usuario/hosts) en la config del hotel");
    }

    // Resolver credenciales (SMTP) usando la misma abstracción
    const creds = resolveEmailCredentials(emailConf);
    if (!creds || creds.source === 'none' || !creds.pass) {
      const expectedVar = secretRef ? emailSecretEnvVarName(secretRef) : 'N/A';
      console.error('[email] Resolución de credenciales fallida', {
        hotelId,
        secretRef,
        expectedVar,
        source: creds?.source,
        reason: creds?.reason,
        inlinePresent: !!inlinePassword,
      });
      throw new Error(`❌ Credenciales SMTP/IMAP no disponibles (secretRef=${secretRef || 'none'} expectedVar=${expectedVar})`);
    }
    console.log('[email] Credenciales resueltas', {
      hotelId,
      user: emailConf.dirEmail,
      secretRef: secretRef || null,
      source: creds.source,
      secure: emailConf.secure,
      smtpHost: emailConf.smtpHost,
      imapHost: emailConf.imapHost,
      smtpPort: emailConf.smtpPort,
      imapPort: emailConf.imapPort,
      sendingEnabled: EMAIL_SENDING_ENABLED,
    });
    if (!EMAIL_SENDING_ENABLED) {
      console.warn('[email] EMAIL_SENDING_ENABLED=false: se inicia polling IMAP pero no se enviarán respuestas automáticas.');
    }
    const workerMode = getEmailWorkerMode();
    const channelEnabled = emailConf.enabled !== false;
    console.log("[email] Runtime mode", { hotelId, workerMode, channelEnabled });
    if (shouldAutoEnableEmailPollingOnStartup(workerMode, channelEnabled)) {
      await setEmailPollingState(hotelId, true);
      console.log(`[email] Runtime watch DEV: polling operacional activado para hotel ${hotelId}.`);
    }

    // Para IMAP y SMTP usamos la misma credencial efectiva del runtime legacy.
    let effectiveEmailPass = creds.pass || inlinePassword;

    const buildImapConfig = (password: string) => ({
      imap: {
        user: EMAIL_USER,
        password,
        host: IMAP_HOST,
        port: Number(IMAP_PORT) || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    });

    const buildTransporter = (password: string) => nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: EMAIL_SECURE,
      auth: EMAIL_SENDING_ENABLED ? { user: EMAIL_USER, pass: password } : undefined,
    });

    let imapConfig = buildImapConfig(effectiveEmailPass);
    let transporter = buildTransporter(effectiveEmailPass);

    lockToken = newEmailBotLockToken(hotelId);
    const startup: EmailBotStartup = { lockToken, cancelled: false };
    emailBotStartingLocks.set(hotelId, startup);
    const acquired = await acquireEmailBotLock(hotelId, lockToken);
    if (!acquired) {
      if (emailBotStartingLocks.get(hotelId) === startup) {
        emailBotStartingLocks.delete(hotelId);
      }
      console.warn(`[email] Ya existe otro proceso email activo para hotelId=${hotelId}. Abortando init.`);
      return;
    }
    if (emailBotStartingLocks.get(hotelId) !== startup || startup.cancelled) {
      await releaseEmailBotLock(hotelId, lockToken);
      if (emailBotStartingLocks.get(hotelId) === startup) {
        emailBotStartingLocks.delete(hotelId);
      }
      console.log(`[email] Startup cancelado durante adquisición de lock para hotel ${hotelId}.`);
      return;
    }
    const runtimeLockToken = lockToken;

    let connection;
    try {
      connection = await imaps.connect(imapConfig);
    } catch (imapErr: any) {
      const authFailed = /auth/i.test(imapErr?.message || '') || imapErr?.textCode === 'AUTHENTICATIONFAILED';
      console.error('💣 [email] Error conectando IMAP (primer intento)', {
        code: imapErr?.code,
        message: imapErr?.message,
        textCode: imapErr?.textCode,
        source: creds.source,
        authFailed,
        hint: 'Verifica: 1) App Password correcto 2) IMAP habilitado en Gmail 3) Variable de entorno 4) host/port/tls: imap.gmail.com:993 TLS true'
      });
      // 🔁 Fallback: si origen fue inline y existe EMAIL_PASS distinto, reintentar una única vez
      if (authFailed && creds.source === 'inline') {
        const alt = process.env.EMAIL_PASS;
        if (alt && alt !== creds.pass) {
          console.warn('[email] Intentando fallback con EMAIL_PASS del entorno (difiere del inline).');
          try {
            effectiveEmailPass = alt;
            const altImapConfig = buildImapConfig(effectiveEmailPass);
            connection = await imaps.connect(altImapConfig);
            imapConfig = altImapConfig;
            transporter = buildTransporter(effectiveEmailPass);
            console.log('[email] ✅ Fallback IMAP exitoso con EMAIL_PASS. Recomiendo migrar a secretRef y remover password inline.');
          } catch (secondErr: any) {
            console.error('[email] ❌ Fallback IMAP también falló', { message: secondErr?.message, textCode: secondErr?.textCode });
            throw imapErr; // conservar error original
          }
        } else {
          throw imapErr;
        }
      } else {
        throw imapErr;
      }
    }
    await connection.openBox("INBOX");
    console.log("📨 Conectado a IMAP como:", EMAIL_USER);
    const registeredStartup = emailBotStartingLocks.get(hotelId);
    const ownsLock = registeredStartup?.lockToken === lockToken
      && await isEmailBotLockOwner(hotelId, lockToken);
    const canPromoteStartup = emailBotStartingLocks.get(hotelId) === registeredStartup
      && !registeredStartup?.cancelled
      && ownsLock;
    if (!canPromoteStartup) {
      await closeEmailConnection(connection);
      if (emailBotStartingLocks.get(hotelId) === registeredStartup) {
        emailBotStartingLocks.delete(hotelId);
      }
      console.log(`[email] Startup cancelado o sin lock para hotel ${hotelId}. No se activa runtime.`);
      return;
    }
    emailBotRuntimes.set(hotelId, {
      hotelId,
      lockToken,
      intervalId: null,
      connection,
      stopping: false,
    });
    if (emailBotStartingLocks.get(hotelId) === registeredStartup) {
      emailBotStartingLocks.delete(hotelId);
    }
    startChannelHeartbeat("email", hotelId);
    const legacyContainment = getEmailLegacyContainmentConfig();
    console.log("[email][legacy] containment", {
      hotelId,
      safeMode: legacyContainment.safeMode,
      lookbackDays: legacyContainment.lookbackDays,
      maxMessages: legacyContainment.maxMessages,
      allowedSenders: legacyContainment.allowedSenders,
    });

    const intervalId = setInterval(async () => {
      const canRun = await shouldContinueEmailProcessing(hotelId, runtimeLockToken);
      console.log(`🔄 [email] Polling de correos habilitado para hotel ${hotelId}:`, canRun);
      if (!canRun) {
        await stopEmailBotRuntime(hotelId, "polling_disabled_or_lock_lost", runtimeLockToken);
        return;
      }

      try {
        const searchCriteria = buildEmailLegacySearchCriteria(new Date(), legacyContainment);
        console.log("[email][legacy] search", {
          hotelId,
          criteria: searchCriteria,
        });

        const messages = await connection.search(
          searchCriteria,
          { bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT", ""], struct: true }
        );
        const selectedMessages = limitLegacyMessages(messages, legacyContainment);

        if (!selectedMessages.length) {
          console.log("📭 [email] No hay mensajes no leídos.");
          if (shouldKeepEmailRuntimeAliveAfterBatch(workerMode)) {
            console.log(`[email] Runtime watch activo para hotel ${hotelId}. Se mantiene polling tras inbox vacío.`);
            return;
          }
          disableEmailPolling(hotelId);
          await stopEmailBotRuntime(hotelId, "empty_inbox", runtimeLockToken);
          return;
        }

        console.log(`📬 [email] Correos candidatos: ${messages.length} | seleccionados: ${selectedMessages.length}`);

        const hotelConfig = await getHotelConfig(hotelId);
        const mode: "automatic" | "supervised" =
          hotelConfig?.channelConfigs?.email?.mode ?? "automatic";

        for (const message of selectedMessages) {
          const continueBetweenMessages = await shouldContinueEmailProcessing(hotelId, runtimeLockToken);
          if (!continueBetweenMessages) {
            console.log(`[email] Corte solicitado para hotel ${hotelId}. Se detiene antes del siguiente mensaje.`);
            await stopEmailBotRuntime(hotelId, "stopped_between_messages", runtimeLockToken);
            return;
          }

          const uid = message.attributes.uid;
          try {
            const allRaw = message.parts.find((p: any) => p.which === "");
            const raw = allRaw?.body;
            const parsed = await simpleParser(raw);
            const flags = Array.isArray(message?.attributes?.flags) ? message.attributes.flags : [];
            const sender = normalizeEmailAddress(parsed.from?.value?.[0]?.address || parsed.from?.text || "");
            const parsedDateIso = parsed.date instanceof Date ? parsed.date.toISOString() : null;

            console.log("[email][legacy][candidate]", {
              hotelId,
              uid,
              flags,
              from: sender,
              subject: parsed.subject || "",
              rfcMessageId: parsed.messageId || "",
              date: parsedDateIso,
            });

            if (!shouldProcessLegacySender(sender, legacyContainment)) {
              console.log("[email][legacy][skip]", {
                hotelId,
                uid,
                reason: "sender_not_allowed",
                from: sender,
              });
              continue;
            }

            // 🟦 DEBUG
            debugLog("\n[DEBUG] EMAIL RECIBIDO UID", uid, {
              from: parsed.from?.text,
              subject: parsed.subject,
              text: parsed.text,
              html: parsed.html,
              date: parsed.date,
              messageId: parsed.messageId,
            });

            // --- FILTRO IRRELEVANTES ---
            if (
              isIrrelevantEmail({
                subject: parsed.subject,
                from: parsed.from?.text,
                text: parsed.text,
                html: parsed.html,
              }) ||
              ((parsed.subject || "").toLowerCase().startsWith("fwd:") &&
                /oferta|promo|descuento|newsletter|ver todo|haz clic|desuscríbete/.test(
                  ((parsed.text || "") + (parsed.html || "")).toLowerCase()
                ))
            ) {
              console.log(
                `🚫 [email] Email irrelevante detectado (mover a 'RAGBOT Irrelevante'):`,
                { uid, subject: parsed.subject, from: parsed.from?.text }
              );
              try {
                try { await connection.addBox("RAGBOT Irrelevante"); } catch { }
                await connection.moveMessage(uid, "RAGBOT Irrelevante");
                console.log(`📂 [email] Email movido a carpeta 'RAGBOT Irrelevante'.`);
              } catch (err) {
                console.warn("⚠️ [email] Error moviendo a carpeta, marcando como leído.", err);
                await connection.addFlags(uid, "\\Seen");
              }
              if (failedUids[uid]) delete failedUids[uid];
              continue;
            }
            // --- FIN FILTRO ---

            const processed = await processInboundEmailMessage({
              hotelId,
              parsed,
              raw,
              mode,
              emailUser: EMAIL_USER,
              sendReply: async ({ to, subject, text }) => {
                await transporter.sendMail({
                  from: EMAIL_USER,
                  to,
                  subject,
                  text,
                });
              },
            });

            if (processed.deduped) {
              await markEmailProcessed(connection, uid);
              if (failedUids[uid]) delete failedUids[uid];
              continue;
            }

            // Marca durable alineada con el search IMAP actual.
            await markEmailProcessed(connection, uid);
            if (failedUids[uid]) delete failedUids[uid];
          } catch (err) {
            console.error(`[email] Error en UID ${uid}:`, err);
            failedUids[uid] = (failedUids[uid] || 0) + 1;
            if (failedUids[uid] >= MAX_UID_ERRORS) {
              console.warn(`[email] UID ${uid} falló ${failedUids[uid]} veces. Ignorando.`);
              delete failedUids[uid];
            }
            continue;
          }
        }

        if (shouldKeepEmailRuntimeAliveAfterBatch(workerMode)) {
          console.log(`[email] Runtime watch activo para hotel ${hotelId}. Batch completado; se mantiene polling habilitado.`);
          return;
        }
        disableEmailPolling(hotelId);
        await stopEmailBotRuntime(hotelId, "batch_completed", runtimeLockToken);
        console.log("🛑 [email] Polling desactivado después de procesar mensajes.");
      } catch (err) {
        console.error("⛔ [email] Error durante polling:", err);
      }
    }, EMAIL_LOOP_INTERVAL_MS);
    const runtime = emailBotRuntimes.get(hotelId);
    if (runtime && runtime.lockToken === lockToken) {
      runtime.intervalId = intervalId;
    }
  } catch (err) {
    if (lockToken) {
      await stopEmailBotRuntime(hotelId, "startup_error", lockToken).catch(() => {
        // best effort cleanup
      });
      if (emailBotStartingLocks.get(hotelId)?.lockToken === lockToken) {
        emailBotStartingLocks.delete(hotelId);
      }
      await releaseEmailBotLock(hotelId, lockToken).catch(() => {
        // best effort cleanup for failures before the runtime was registered
      });
    }
    console.error("💥 [email] Error  crítico al iniciar el bot:", err);
    throw err;
  }
}

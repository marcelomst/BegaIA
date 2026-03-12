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
import { getEmailPollingState } from "@/lib/services/emailPollingState"; // ✅ path absoluto correcto
import { getMessageByOriginalIdScoped } from "@/lib/db/messages"; // Idempotencia
import { debugLog } from "@/lib/utils/debugLog";

const MAX_UID_ERRORS = 3;
const failedUids: Record<number, number> = {};

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

  const senderEmail = String(channelMsg.sender || "").trim().toLowerCase();

  const result = await handleChannelMessage({
    query: cleaned,
    hotelId,
    channel: "email",
    guestId: senderEmail,
    sender: senderEmail || "guest",
    sourceMsgId: channelMsg.originalMessageId ?? channelMsg.messageId,
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
}

export async function startEmailBot({
  hotelId,
  emailConf,
}: {
  hotelId: string;
  emailConf: EmailConfig;
}) {
  console.log("📥 [email] Iniciando bot de correo...");

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

    // Para IMAP usamos (por ahora) la misma password; si difiere en el futuro se puede extender EmailConfig
    const EMAIL_PASS = creds.pass || inlinePassword;

    const imapConfig = {
      imap: {
        user: EMAIL_USER,
        password: EMAIL_PASS,
        host: IMAP_HOST,
        port: Number(IMAP_PORT) || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    };

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: EMAIL_SECURE,
      auth: EMAIL_SENDING_ENABLED ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
    });

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
            const altImapConfig = { imap: { ...imapConfig.imap, password: alt } } as any;
            connection = await imaps.connect(altImapConfig);
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

    setInterval(async () => {
      const enabled = await getEmailPollingState(hotelId);
      console.log(`🔄 [email] Polling de correos habilitado para hotel ${hotelId}:`, enabled);
      if (!enabled) return;

      try {
        const messages = await connection.search(
          ["UNSEEN", ["UNKEYWORD", "RAGBOT_PROCESSED"]],
          { bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT", ""], struct: true }
        );

        if (!messages.length) {
          console.log("📭 [email] No hay mensajes no leídos.");
          disableEmailPolling(hotelId);
          return;
        }

        console.log(`📬 [email] Correos no leídos: ${messages.length}`);

        const hotelConfig = await getHotelConfig(hotelId);
        const mode: "automatic" | "supervised" =
          hotelConfig?.channelConfigs?.email?.mode ?? "automatic";

        for (const message of messages) {
          const uid = message.attributes.uid;
          try {
            const allRaw = message.parts.find((p: any) => p.which === "");
            const raw = allRaw?.body;
            const parsed = await simpleParser(raw);

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
              await connection.addFlags(uid, "\\Seen");
              if (failedUids[uid]) delete failedUids[uid];
              continue;
            }

            // Marcar como leído solo los válidos procesados
            await connection.addFlags(uid, "\\Seen");
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

        disableEmailPolling(hotelId);
        console.log("🛑 [email] Polling desactivado después de procesar mensajes.");
      } catch (err) {
        console.error("⛔ [email] Error durante polling:", err);
      }
    }, 15000);
  } catch (err) {
    console.error("💥 [email] Error  crítico al iniciar el bot:", err);
    throw err;
  }
}

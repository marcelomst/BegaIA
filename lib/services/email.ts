// Path: /root/begasist/lib/services/email.ts
import { simpleParser } from "mailparser";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import { flattenParts } from "@/lib/utils/emailParts";
import { parseEmailToChannelMessage } from "@/lib/parsers/emailParser";
import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { EmailConfig } from "@/types/channel";
import { standardCleanup } from "@/lib/utils/emailCleanup";
import { disableEmailPolling } from "@/lib/services/emailPollControl";
import { getEmailPollingState } from "@/lib/services/emailPollingState"; // ✅ path absoluto correcto
import { getMessageByOriginalId } from "@/lib/db/messages"; // Idempotencia
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
    "oferta","promo","promoción","newsletter","marketing","advertising",
    "publicidad","descuento","haz clic","ver todo","desuscríbete","unsubscribe",
    "gestiona tu suscripción","suscribete","mailup","mailchimp","ganaste",
    "prueba gratis","free trial","auto-reply","mailer-daemon","este mensaje es automático"
  ];
  const spamFrom = [
    "@news.","@promo.","@marketing.","no-reply","noreply","mailer-daemon","mailup","mailchimp","newsletter"
  ];
  const allFields = [subject, from, text, html].map(f => (f || "").toLowerCase());
  return (
    spamWords.some(word => allFields.some(field => field.includes(word))) ||
    spamFrom.some(mask => (from || "").toLowerCase().includes(mask))
  );
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
      password: EMAIL_PASS,
      imapHost: IMAP_HOST,
      imapPort: IMAP_PORT,
      smtpHost: SMTP_HOST,
      smtpPort: SMTP_PORT,
      secure: EMAIL_SECURE = false,
    } = emailConf;

    if (!EMAIL_USER || !EMAIL_PASS || !IMAP_HOST || !SMTP_HOST) {
      throw new Error("❌ Faltan datos críticos de email en la config del hotel");
    }

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
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const connection = await imaps.connect(imapConfig);
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
                try { await connection.addBox("RAGBOT Irrelevante"); } catch {}
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

            // Parseo a ChannelMessage base
            const channelMsg = await parseEmailToChannelMessage({
              parsed,
              hotelId,
              raw,
            });

            // Idempotencia por messageId
            const IGNORE_IDEMPOTENCY = process.env.EMAIL_BOT_IGNORE_IDEMPOTENCY === "true";
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
              channelMsg.originalMessageId = hashVal;
            } else {
              channelMsg.originalMessageId = originalMessageId;
            }

            if (!IGNORE_IDEMPOTENCY) {
              const alreadyExists = await getMessageByOriginalId(channelMsg.originalMessageId!);
              if (alreadyExists) {
                console.log(`[email] Mensaje duplicado detectado, no se guarda:`, channelMsg.originalMessageId);
                await connection.addFlags(uid, "\\Seen");
                if (failedUids[uid]) delete failedUids[uid];
                continue;
              }
            }

            // Limpieza estándar y defaults que exige el tipo
            const rawText = channelMsg.content || "";
            const cleaned = standardCleanup(rawText);
            channelMsg.content = cleaned;
            channelMsg.suggestion = channelMsg.suggestion ?? ""; // ✅ evitar TS error con tipo estricto
            console.log(`🧹 [email] Texto limpiado para UID ${uid}:`, cleaned);

            // ✅ Llamada correcta (3 parámetros): msg + hotelId + opts
          await universalChannelEventHandler(
            {
              hotelId,
              conversationId: channelMsg.conversationId!,         // viene del parser
              channel: channelMsg.channel,                         // "email"
              from: "guest",                                       // entrante
              content: cleaned,
              // para idempotencia en email conviene usar el Message-ID del RFC:
              sourceMsgId: channelMsg.originalMessageId ?? channelMsg.messageId,
              timestamp: parsed.date ? parsed.date.getTime() : Date.now(),
              // (opcional) subject/meta si tu UniversalEvent los define:
              // subject: channelMsg.subject,
              // meta: channelMsg.meta,
            },
            {
              mode,
              sendReply: async (reply: string) => {
                await transporter.sendMail({
                  from: EMAIL_USER,
                  to: channelMsg.sender || parsed.from?.text || EMAIL_USER,
                  subject: "Re: " + (channelMsg.subject || parsed.subject || ""),
                  text: reply,
                });
                console.log(
                  `📤 [email] Respuesta enviada a ${channelMsg.sender || parsed.from?.text}`
                );
              },
            }
          );

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

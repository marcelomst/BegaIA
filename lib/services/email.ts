// Path: /root/begasist/lib/services/email.ts

import { simpleParser } from "mailparser";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import { flattenParts } from "@/lib/utils/emailParts";
import { parseEmailToChannelMessage } from "@/lib/parsers/emailParser";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { EmailConfig } from "@/types/channel";
import { standardCleanup } from "@/lib/utils/emailCleanup";
import { disableEmailPolling } from "@/lib/services/emailPollControl";
import { getEmailPollingState } from "./emailPollingState";
import { getMessageByOriginalId } from "@/lib/db/messages"; // Idempotencia

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
  // Convertir todos los campos relevantes a minúscula para búsqueda
  const allFields = [subject, from, text, html].map(f => (f || "").toLowerCase());
  // Si alguna palabra aparece en cualquier campo, o el from tiene máscara
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
        const messages = await connection.search(["UNSEEN"], {
          bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT", ""],
          struct: true,
        });

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
            // Extrae el raw del mensaje completo
            const allRaw = message.parts.find((p: any) => p.which === "");
            const raw = allRaw?.body;
            const parsed = await simpleParser(raw);

            // 🟦 DEBUG: Mostrá todo lo relevante ANTES del filtro
            console.log("\n[DEBUG] EMAIL RECIBIDO UID", uid, {
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
              // Extra: si subject arranca con Fwd: y el contenido es muy marketing
              ((parsed.subject || "").toLowerCase().startsWith("fwd:") &&
                /oferta|promo|descuento|newsletter|ver todo|haz clic|desuscríbete/.test(
                  ((parsed.text || "") + (parsed.html || "")).toLowerCase()
                ))
            ) {
              console.log(
                `🚫 [email] Email irrelevante detectado (mover a 'RAGBOT Irrelevante'):`,
                {
                  uid,
                  subject: parsed.subject,
                  from: parsed.from?.text,
                }
              );
              try {
                // Crear carpeta si no existe
                try {
                  await connection.addBox("RAGBOT Irrelevante");
                } catch {}
                await connection.moveMessage(uid, "RAGBOT Irrelevante");
                console.log(`📂 [email] Email movido a carpeta 'RAGBOT Irrelevante'.`);
              } catch (err) {
                console.warn("⚠️ [email] Error moviendo a carpeta, marcando como leído.", err);
                await connection.addFlags(uid, "\\Seen");
              }
              if (failedUids[uid]) delete failedUids[uid];
              continue;
            }
            // --- FIN FILTRO IRRELEVANTES ---

            // Parseo básico del canalMsg (solo para tener los campos)
            const channelMsg = await parseEmailToChannelMessage({
              parsed,
              hotelId,
              raw,
            });

            // 💡 IDEMPOTENCIA ANTI-DUPLICADOS:
            // Usar el messageId del email como identificador único lógico
            let originalMessageId = parsed.messageId || channelMsg.originalMessageId || channelMsg.messageId;
            if (!originalMessageId) {
              // Si no hay messageId, generá uno por hash de from+subject+date+body como fallback
              let hashVal = "";
              try {
                const base = [
                  parsed.from?.text, parsed.subject, parsed.date, parsed.text, parsed.html
                ].filter(Boolean).join("|");
                // Usa require si está en Node, si no, fallback a string manual
                const crypto = typeof require !== "undefined" ? require("crypto") : null;
                hashVal = crypto
                  ? crypto.createHash("sha256").update(base).digest("hex")
                  : base; // fallback poco robusto pero evita crash
              } catch (e) {
                hashVal = Math.random().toString(36).slice(2, 12);
              }
              channelMsg.originalMessageId = hashVal;
            } else {
              channelMsg.originalMessageId = originalMessageId;
            }

            // Consultar en Astra si ya existe este messageId
            const alreadyExists = await getMessageByOriginalId(channelMsg.originalMessageId!);
            if (alreadyExists) {
              console.log(`[email] Mensaje duplicado detectado, no se guarda:`, channelMsg.originalMessageId);
              // Marcar como leído igual para no reprocesar
              await connection.addFlags(uid, '\\Seen');
              if (failedUids[uid]) delete failedUids[uid];
              continue;
            }

            const from = channelMsg.sender || "";
            const subject = channelMsg.subject || "";
            const rawText = channelMsg.content || "";

            // Limpieza estándar para todos (sin IA previa)
            const cleaned = standardCleanup(rawText);
            channelMsg.content = cleaned;
            console.log(`🧹 [email] Texto limpiado para UID ${uid}:`, cleaned);

            await handleIncomingMessage(
              { ...channelMsg, content: cleaned },
              {
                autoReply: mode === "automatic",
                sendReply: async (reply: string) => {
                  await transporter.sendMail({
                    from: EMAIL_USER,
                    to: from,
                    subject: "Re: " + subject,
                    text: reply,
                  });
                  console.log(`📤 [email] Respuesta enviada a ${from}`);
                },
                mode,
              }
            );

            // Marcar como leído solo los válidos procesados
            await connection.addFlags(uid, '\\Seen');

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

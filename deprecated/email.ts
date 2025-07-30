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

const MAX_UID_ERRORS = 3;
const failedUids: Record<number, number> = {};

function isIrrelevantEmail({ subject = "", from = "" }: { subject?: string; from?: string }) {
  const spamWords = ["oferta", "promo", "newsletter", "marketing", "advertising", "publicidad"];
  const spamFrom = ["@news.", "@promo.", "@marketing.", "no-reply", "noreply"];
  const subj = subject.toLowerCase();
  const sender = from.toLowerCase();
  return spamWords.some(word => subj.includes(word)) || spamFrom.some(mask => sender.includes(mask));
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

        console.log(`📬 [email] Correos no leídos en version actual: ${messages.length}`);
        
        const hotelConfig = await getHotelConfig(hotelId);
        const mode: "automatic" | "supervised" =
          hotelConfig?.channelConfigs?.email?.mode ?? "automatic";
        console.log(`[email] Cantidad de mensajes: ${messages.length}`);
        for (const message of messages) {
          const uid = message.attributes.uid;
          try {
            console.log(`🔍 Procesando UID ${uid}...`);
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
            });

            // Parseo básico del canalMsg (solo para tener los campos)
            const channelMsg = await parseEmailToChannelMessage({
              parsed,
              hotelId,
              raw,
            });
            const from = channelMsg.sender || "";
            const subject = channelMsg.subject || "";
            const rawText = channelMsg.content || "";
            const texto = (rawText || "").trim().toLowerCase();

            // 🟧 HEURÍSTICA de BASURA/IRRELEVANTE mejorada
            // Palabras y patrones de spam típicos
            const spamWords = [
              "unsubscribe",
              "este mensaje es automático",
              "no responder a este email",
              "mailer-daemon",
              "out of office",
              "auto-reply",
              "publicidad",
              "newsletter",
              "promo",
              "oferta",
              "marketing",
              "advertising",
              "ganaste",
              "free trial",
              "prueba gratis"
            ];
            const spamSenders = [
              "noreply",
              "no-reply",
              "newsletter",
              "promo",
              "marketing",
              "@news.",
              "@promo.",
              "@marketing.",
            ];

            // Detectar irrelevancia por subject, sender, contenido
            const isSpam =
              !from ||
              !texto ||
              spamWords.some(word =>
                subject.toLowerCase().includes(word) ||
                texto.includes(word)
              ) ||
              spamSenders.some(mask =>
                from.toLowerCase().includes(mask)
              );

            if (isSpam) {
              console.warn(`⚠️ [email] Email considerado irrelevante y movido a 'RAGBOT Irrelevante'`, {
                from,
                subject,
              });
              try {
                // Crear carpeta si no existe
                try {
                  await connection.addBox("RAGBOT Irrelevante");
                } catch {}
                await connection.moveMessage(uid, "RAGBOT Irrelevante");
              } catch {
                // Fallback: marcar como leído si no se puede mover
                await connection.addFlags(uid, '\\Seen');
              }
              if (failedUids[uid]) delete failedUids[uid];
              continue;
            }

            // 🔵 Si no es irrelevante, limpiar y seguir flujo normal
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
    console.error("💥 [email] Error crítico al iniciar el bot:", err);
    throw err;
  }
}

// lib/services/email.ts
import { simpleParser } from "mailparser";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import { agentGraph } from "../agents";
import { HumanMessage } from "@langchain/core/messages";
import dotenv from "dotenv";

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function startEmailBot() {
  console.log("📥 [email] Iniciando bot de correo...");

  try {
    const {
      EMAIL_USER,
      EMAIL_PASS,
      IMAP_HOST,
      IMAP_PORT,
      SMTP_HOST,
      SMTP_PORT,
      EMAIL_SECURE,
    } = process.env;

    if (!EMAIL_USER || !EMAIL_PASS || !IMAP_HOST || !SMTP_HOST) {
      throw new Error("❌ Faltan variables de entorno críticas (EMAIL_USER, EMAIL_PASS, IMAP_HOST, SMTP_HOST)");
    }

    const imapConfig = {
      imap: {
        user: EMAIL_USER,
        password: EMAIL_PASS,
        host: IMAP_HOST,
        port: Number(IMAP_PORT) || 993,
        tls: true,
        authTimeout: 3000,
      },
    };

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: EMAIL_SECURE === "true",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const connection = await imaps.connect(imapConfig);
    await connection.openBox("INBOX");

    console.log("✅ [email] Bot de email conectado y escuchando (cada 15s)");

    setInterval(async () => {
      try {
        const messages = await connection.search(["UNSEEN"], {
          bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
          struct: true,
        });

        if (messages.length > 0) {
          console.log(`📬 [email] Correos no leídos: ${messages.length}`);
        }

        for (const message of messages) {
          const parts = imaps.getParts(message.attributes.struct);
          const part = parts.find((p: any) => p.type === "text");
          if (!part) continue;

          const raw = await connection.getPartData(message, part);
          const headerPart = message.parts.find((p: any) => p.which?.toLowerCase().includes("header"));
          const rawFrom = Array.isArray(headerPart?.body?.from) ? headerPart.body.from[0] : undefined;

          const parsed = await simpleParser(raw);

          const htmlRaw =
            typeof parsed.html === "string"
              ? parsed.html
              : Buffer.isBuffer(parsed.html)
              ? parsed.html.toString("utf-8")
              : "";

          const htmlClean = htmlRaw.replace(/<[^>]+>/g, "").trim();

          const text =
            parsed.text?.trim() ||
            htmlClean ||
            parsed.headerLines?.map((h: { key: string; line: string }) => h.line).join("\n").trim();

          const from =
            parsed.from?.text ||
            rawFrom ||
            parsed.headerLines?.find((h: { key: string; line: string }) => h.line.includes("@"))?.line;

          if (text && from) {
            console.log(`📧 [email] Email de ${from}`);

            const response = await agentGraph.invoke({
              messages: [new HumanMessage(text)],
            });

            const reply = response.messages.at(-1)?.content;

            if (typeof reply === "string") {
              await transporter.sendMail({
                from: EMAIL_USER,
                to: from,
                subject: "Re: " + (parsed.subject || "Consulta recibida"),
                text: reply,
              });

              console.log(`📤 [email] Respuesta enviada a ${from}`);
            }
          } else {
            console.warn("⚠️ [email] Email sin texto o sin remitente válido", { from, text });
          }
        }
      } catch (intervalErr) {
        console.error("⛔ [email] Error procesando correos:", intervalErr);
      }
    }, 15000);
  } catch (startupErr) {
    console.error("💥 [email] Error crítico al iniciar el bot:", startupErr);
    throw startupErr;
  }
}

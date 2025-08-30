// Path: /root/begasist/lib/services/whatsapp.baileys.ts

import qrcode from "qrcode-terminal";
import Redis from "ioredis";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import crypto from "crypto";
import type { BaileysEventMap } from "@whiskeysockets/baileys";
import type { ChannelMessage } from "@/types/channel";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

// ⬇️ NEW: adapters
import { registerAdapter } from "@/lib/adapters/registry";
import { whatsappBaileysAdapter, bindBaileysSock } from "@/lib/adapters/whatsappBaileysAdapter";

function getTextFromBaileys(m: any): string {
  return (
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    m?.message?.imageMessage?.caption ||
    m?.message?.videoMessage?.caption ||
    ""
  );
}

// 1) Redis único (reutilizable)
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Helper para publicar QR por hotel
async function setQR(hotelId: string, qr: string) {
  try {
    await redis.set(`wa:qr:${hotelId}`, qr, "EX", 120);
  } catch {}
}

export async function startWhatsAppBot({
  hotelId,
  hotelPhone,
}: {
  hotelId: string;
  hotelPhone?: string;
}) {
  // ──────────────────────────────────────────────────────────
  // Config dependiente del hotel
  // ──────────────────────────────────────────────────────────
  const TAG = `[wa-dev] (baileys-node18-dev:${hotelId})`;
  const AUTH_DIR = `/data/baileys_auth/${hotelId}`;

  // Polyfill WebCrypto para Node 18
  const { webcrypto } = await import("crypto");
  // @ts-ignore
  if (!globalThis.crypto) (globalThis as any).crypto = webcrypto as any;

  const baileys = await import("@whiskeysockets/baileys");
  const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    Browsers,
  } = baileys as any;

  // Rotación de endpoints WebSocket y UA
  const wsCandidates = [
    process.env.WA_WS_URL || "wss://web.whatsapp.com/ws/chat?__e2e=1",
    "wss://web.whatsapp.com/ws/chat",
    "wss://web.whatsapp.com/ws/chat?__e2e=1&__s=1",
  ];
  let wsIdx = 0;

  const uaCandidates = [() => Browsers.windows("Chrome"), () => Browsers.macOS("Safari")];
  let uaIdx = 0;

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let reconnectTimer: NodeJS.Timeout | null = null;
  let backoffMs = 1500; // exponencial hasta 60s
  let preRegister401s = 0;
  let sock: any;

  // ⬇️ NEW: registrar el adapter una sola vez (idempotente)
  registerAdapter(whatsappBaileysAdapter);

  const logUpdate = (update: any, err?: any) => {
    const { connection, qr } = update;
    const hasQR = Boolean(qr);
    const sc = err?.output?.statusCode ?? err?.statusCode ?? update?.statusCode;
    const message = err?.message ?? update?.message;
    const location = err?.data?.location ?? update?.location;
    console.log(`${TAG} 🔎 connection.update`, { connection, hasQR, statusCode: sc, message, location });
  };

  const startSock = () => {
    const wsUrl = wsCandidates[wsIdx % wsCandidates.length];
    const browser = uaCandidates[uaIdx % uaCandidates.length]();

    console.log(`${TAG} 🌐 Usando ws=${wsUrl} | UA#${uaIdx} | backoff=${backoffMs}ms`);
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      syncFullHistory: false,
      waWebSocketUrl: wsUrl,
      markOnlineOnConnect: false,
    });

    // ⬇️ NEW: exponer el socket al adapter para envío
    bindBaileysSock(sock);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      const err: any = lastDisconnect?.error;
      logUpdate(update, err);

      if (qr) {
        preRegister401s = 0;
        console.log(`${TAG} ⚠️ QR recibido. Escanealo SOLO con el TELÉFONO (Dispositivos vinculados):`);
        qrcode.generate(qr, { small: true });
        await setQR(hotelId, qr);
      }

      if (connection === "open") {
        console.log(`${TAG} ✅ Conectado a WhatsApp con éxito`);
        backoffMs = 1500;
        preRegister401s = 0;
      }

      if (connection === "close") {
        const statusCode = err?.output?.statusCode ?? err?.statusCode ?? update?.statusCode;

        // 401 sin sesión (pre-registro): cambio ws/UA y backoff
        if ((statusCode === 401 || statusCode === DisconnectReason.loggedOut) && !state.creds?.registered) {
          preRegister401s++;
          wsIdx++;
          if (preRegister401s % 3 === 0) uaIdx++;
          backoffMs = Math.min(backoffMs * 2, 60_000);

          if (!reconnectTimer) {
            console.log(`${TAG} ❌ 401 pre-registro. Rotando WS/UA y reintentando en ${backoffMs}ms…`);
            reconnectTimer = setTimeout(() => {
              reconnectTimer && clearTimeout(reconnectTimer);
              reconnectTimer = null;
              console.log(`${TAG} 🔁 Reiniciando socket (pre-registro)…`);
              startSock();
            }, backoffMs);
          }
          return;
        }

        // 401 con sesión: limpiar y salir (para que Docker reinicie)
        if (statusCode === 401 && state.creds?.registered) {
          console.log(`${TAG} ❌ 401 con sesión; limpio credenciales y reinicio…`);
          try {
            if (existsSync(AUTH_DIR)) await rm(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          process.exit(1);
          return;
        }

        // 515/otros
        const delay = Math.min(backoffMs + 500, 30_000);
        if (!reconnectTimer) {
          console.log(`${TAG} ❌ Cierre no-401 (status=${statusCode ?? "?"}). Reintentando en ${delay}ms…`);
          reconnectTimer = setTimeout(() => {
            reconnectTimer && clearTimeout(reconnectTimer);
            reconnectTimer = null;
            console.log(`${TAG} 🔁 Reiniciando socket…`);
            startSock();
          }, delay);
        }
      }
    });

    console.log(`${TAG} registrando handler messages.upsert`);

    // 2) UP SERT ⇒ Canal WhatsApp → PIPE unificado
    sock.ev.on(
      "messages.upsert",
      async ({ type, messages }: BaileysEventMap["messages.upsert"]) => {
        const m = messages?.[0];
        if (!m) return;

        const jid = m.key?.remoteJid;
        const fromMe = m.key?.fromMe;

        // Texto “normal” o de extended/image caption
        const text =
          m.message?.conversation ??
          m.message?.extendedTextMessage?.text ??
          m.message?.imageMessage?.caption ??
          "";

        // Ignorá propios o vacíos
        if (!jid || fromMe || !text) return;

        console.log(`${TAG} upsert:`, { type, jid, fromMe, text: text.slice(0, 200) });

        try {
          // Delivery hints (opcional)
          await sock.readMessages([m.key as any]);
          await sock.sendPresenceUpdate("composing", jid);

          // Construir ChannelMessage y delegar al PIPE
          const now = new Date();
          const conversationId = `${hotelId}-whatsapp-${jid}`;

          const remoteJid = m.key.remoteJid as string;
          const text = getTextFromBaileys(m);
          if (!text) return;

          const tsMs =
            (Number(m.messageTimestamp) ? Number(m.messageTimestamp) * 1000 : Date.now());

          const channelMsg: ChannelMessage = {
            messageId: m.key.id || crypto.randomUUID(),
            hotelId,
            channel: "whatsapp",
            conversationId: `${hotelId}-whatsapp-${remoteJid}`,
            sender: m.pushName || remoteJid,
            guestId: remoteJid,
            content: text,
            timestamp: new Date(tsMs).toISOString(),
            time: new Date(tsMs).toLocaleTimeString(),
            suggestion: "",           // 👈 obligatorio en tu tipo
            status: "sent",           // o "pending" si preferís
            detectedLanguage: undefined, // opcional, tu pipeline puede inferirlo luego
          };

          const mode: "automatic" | "supervised" = "automatic";

          await handleIncomingMessage(channelMsg, {
            mode,
            sendReply:
              mode === "automatic"
                ? async (reply: string) => {
                    await sock.sendMessage(remoteJid, { text: reply });
                  }
                : undefined,
          });

        } catch (err) {
          console.error(`${TAG} error al procesar mensaje:`, err);
          try {
            await sock.sendPresenceUpdate("available", jid);
          } catch {}
        }
      }
    );
  };

  startSock();

  // 3) Heartbeat por hotel
  setInterval(() => {
    redis.set(`wa:heartbeat:${hotelId}`, Date.now().toString(), "EX", 60).catch(() => {});
  }, 15_000);
}

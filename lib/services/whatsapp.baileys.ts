// Path: /root/begasist/lib/services/whatsapp.baileys.ts

import qrcode from "qrcode-terminal";
import Redis from "ioredis";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import type { BaileysEventMap } from '@whiskeysockets/baileys';


const TAG = "[wa-dev] (baileys-node18-dev)";
const AUTH_DIR = "/data/baileys_auth/hotel999";
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function setQR(qr: string) {
  try {
    await redis.set("wa:qr:hotel999", qr, "EX", 120);
  } catch {}
}

export async function startWhatsAppBot() {
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

  // Rotación de endpoints WebSocket (algunas regiones son más estrictas)
  const wsCandidates = [
    process.env.WA_WS_URL || "wss://web.whatsapp.com/ws/chat?__e2e=1",
    "wss://web.whatsapp.com/ws/chat",
    "wss://web.whatsapp.com/ws/chat?__e2e=1&__s=1",
  ];
  let wsIdx = 0;

  // Rotación de User-Agent emulado
  const uaCandidates = [
    () => Browsers.windows("Chrome"),
    () => Browsers.macOS("Safari"),
  ];
  let uaIdx = 0;

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let reconnectTimer: NodeJS.Timeout | null = null;
  let backoffMs = 1500; // exponencial hasta 60s
  let preRegister401s = 0;
  let sock: any;

  const logUpdate = (update: any, err?: any) => {
    const { connection, qr } = update;
    const hasQR = Boolean(qr);
    const sc =
      err?.output?.statusCode ??
      err?.statusCode ??
      update?.statusCode;
    const message = err?.message ?? update?.message;
    const location = err?.data?.location ?? update?.location;
    console.log(`${TAG} 🔎 connection.update`, {
      connection, hasQR, statusCode: sc, message, location,
    });
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

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      const err: any = lastDisconnect?.error;
      logUpdate(update, err);

      if (qr) {
        preRegister401s = 0; // si ya tenemos QR, reseteamos contadores
        console.log(`${TAG} ⚠️ QR recibido. Escanealo SOLO con el TELÉFONO (Dispositivos vinculados):`);
        qrcode.generate(qr, { small: true });
        await setQR(qr);
      }

      if (connection === "open") {
        console.log(`${TAG} ✅ Conectado a WhatsApp con éxito v1`);
        backoffMs = 1500;
        preRegister401s = 0;
      }

      if (connection === "close") {
        const statusCode =
          err?.output?.statusCode ??
          err?.statusCode ??
          update?.statusCode;

        // 401 sin sesión (pre-registro): cambio ws/UA y hago backoff
        if ((statusCode === 401 || statusCode === DisconnectReason.loggedOut) && !state.creds?.registered) {
          preRegister401s++;
          // rotamos ws y UA para el próximo intento
          wsIdx++;
          if (preRegister401s % 3 === 0) uaIdx++;

          // backoff exponencial hasta 60s
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

        // 401 con sesión: limpiamos y que Docker reinicie
        if (statusCode === 401 && state.creds?.registered) {
          console.log(`${TAG} ❌ 401 con sesión; limpio credenciales y reinicio…`);
          try {
            if (existsSync(AUTH_DIR)) await rm(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          process.exit(1);
          return;
        }

        // 515/otros: retry con backoff moderado pero sin rotación agresiva
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

    console.log('[wa-dev] registrando handler messages.upsert');

    sock.ev.on(
      'messages.upsert',
      async ({ type, messages }: BaileysEventMap['messages.upsert']) => {
        const m = messages?.[0];
        if (!m) return;

        const jid = m.key?.remoteJid;
        const fromMe = m.key?.fromMe;

        const text =
          m.message?.conversation ??
          m.message?.extendedTextMessage?.text ??
          m.message?.imageMessage?.caption ??
          '';

        console.log('[wa-dev] upsert:', {
          type,
          jid,
          fromMe,
          text: text?.slice(0, 200),
        });

        // Respuesta simple: eco, solo si no es nuestro propio mensaje
        if (!fromMe && jid && text) {
          try {
            await sock.readMessages([m.key as any]);
            await sock.sendPresenceUpdate('composing', jid);
            await sock.sendMessage(jid, { text: `✅ Recibido: ${text}` });
            await sock.sendPresenceUpdate('available', jid);
          } catch (err) {
            console.error('[wa-dev] error al responder:', err);
          }
        }
      }
    );


  };

  startSock();

  setInterval(() => {
    redis.set("wa:heartbeat:hotel999", Date.now().toString(), "EX", 60).catch(() => {});
  }, 15_000);
}

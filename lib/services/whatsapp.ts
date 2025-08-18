// Path: /root/begasist/lib/services/whatsapp.ts

import { Message } from "whatsapp-web.js";
import { whatsappClient as client } from "./whatsappClient";
import qrcode from "qrcode-terminal";

import { parseWhatsAppToChannelMessage } from "@/lib/parsers/whatsappParser";
import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getMessagesFromAstra, updateMessageInAstra } from "@/lib/db/messages";

import { setQR, clearQR, setWhatsAppState } from "@/lib/services/redis";
import { startChannelHeartbeat } from "@/lib/services/heartbeat";
import { normalizePhone } from "@/lib/config/hotelPhoneMap";

/**
 * Evita múltiples inicializaciones en dev/hot-reload.
 */
const INIT_KEY = "__WA_INIT__";
const POLLER_KEY = "__WA_POLLERS__" as const;

type PollerMap = Record<string, NodeJS.Timeout>;

// @ts-ignore - attach to global for dev
if (!(globalThis as any)[POLLER_KEY]) {
  (globalThis as any)[POLLER_KEY] = {};
}

function ensureSinglePoller(hotelId: string, create: () => NodeJS.Timeout) {
  const map = (globalThis as any)[POLLER_KEY] as PollerMap;
  if (map[hotelId]) return; // ya existe
  map[hotelId] = create();
}

function clearPoller(hotelId: string) {
  const map = (globalThis as any)[POLLER_KEY] as PollerMap;
  if (map[hotelId]) {
    clearInterval(map[hotelId]);
    delete map[hotelId];
  }
}

/**
 * Nota: el control de grupos ahora es por hotel desde hotel_config.channelConfigs.whatsapp.ignoreGroups
 * (por defecto true si no está definido).
 */
export function startWhatsAppBot({ hotelId, hotelPhone }: { hotelId: string; hotelPhone?: string }) {
  if (!hotelId) {
    console.warn("⚠️ [whatsapp] startWhatsAppBot llamado sin hotelId. Abortando init.");
    return;
  }

  // Idempotencia de init (en dev/hot reload)
  // @ts-ignore
  if ((globalThis as any)[INIT_KEY]?.[hotelId]) {
    console.log(`↪️ [whatsapp] Ya inicializado para hotelId=${hotelId}, evitando doble init.`);
  } else {
    // @ts-ignore
    (globalThis as any)[INIT_KEY] = (globalThis as any)[INIT_KEY] || {};
    // @ts-ignore
    (globalThis as any)[INIT_KEY][hotelId] = true;

    // Handlers de ciclo de vida
    client.on("qr", async (qr) => {
      try {
        console.log(`⚡ [whatsapp] QR generado para hotelId=${hotelId}. Escaneá para conectar:`);
        qrcode.generate(qr, { small: true });
        await setQR(hotelId, qr);
        await setWhatsAppState(hotelId, "waiting_qr");
        startChannelHeartbeat("whatsapp", hotelId);
      } catch (err) {
        console.error("⛔ [whatsapp] Error seteando QR/estado:", err);
      }
    });

    client.on("ready", async () => {
      console.log(`✅ [whatsapp] Bot listo para hotelId=${hotelId}`);
      try {
        await clearQR(hotelId);
        await setWhatsAppState(hotelId, "connected");
      } catch (err) {
        console.error("⛔ [whatsapp] Error en ready (limpiar QR/estado):", err);
      }
      startChannelHeartbeat("whatsapp", hotelId);
    });

    client.on("auth_failure", async (msg) => {
      console.error(`❌ [whatsapp] auth_failure para hotelId=${hotelId}:`, msg);
      await setWhatsAppState(hotelId, "auth_failed");
    });

    client.on("disconnected", async (reason) => {
      console.warn(`❌ [whatsapp] Bot desconectado hotelId=${hotelId}: ${reason}`);
      await setWhatsAppState(hotelId, "disconnected");
      // Limpiar poller en desconexión para no dejar intervalos colgando
      clearPoller(hotelId);
    });

    /**
     * Handler de mensaje entrante (listener local con wwebjs)
     */
    client.on("message", async (message: Message) => {
      // Ignorar mensajes propios del bot
      if (message.fromMe) return;

      try {
        // Cargar configuración por hotel (mode + ignoreGroups)
        const hotelConfig = await getHotelConfig(hotelId);
        const mode: "automatic" | "supervised" =
          hotelConfig?.channelConfigs?.whatsapp?.mode ?? "automatic";
        const ignoreGroups: boolean =
          hotelConfig?.channelConfigs?.whatsapp?.ignoreGroups ?? true;

        // Filtrar grupos si el hotel lo configuró así
        if (ignoreGroups && message.from.endsWith("@g.us")) return;

        console.log(
          `📩 [whatsapp] hotel=${hotelId} de=${message.from} cuerpo="${(message.body || "").slice(0, 200)}"`
        );

        if (!hotelPhone) {
          console.warn(`⚠️ [whatsapp] hotelPhone no definido para hotelId=${hotelId}. Evito respuesta.`);
        }

        // Normalizar JID manteniendo sufijo si corresponde
        const senderJid = normalizePhone(message.from);

        // Parseo específico del canal → estructura base uniforme
        const parsed = await parseWhatsAppToChannelMessage({
          message,
          hotelId,
          guestId: senderJid,
        });

        // Asegurar campos mínimos para el handler universal
        const rawEvent = {
          ...parsed,
          channel: "whatsapp",
          guestId: parsed.guestId || senderJid,
          sender: parsed.sender || senderJid,
          timestamp: parsed.timestamp || new Date().toISOString(),
        };

        // 🔄 Handler universal: detección idioma + sentimiento + handleIncomingMessage
        await universalChannelEventHandler(rawEvent, hotelId, {
          mode,
          sendReply: async (reply: string) => {
            try {
              // Envío real por WhatsApp (client)
              await client.sendMessage(senderJid, reply);
            } catch (err) {
              console.error("⛔ [whatsapp] Error enviando respuesta al usuario:", err);
            }
          },
        });
      } catch (error) {
        console.error("⛔ [whatsapp] Error procesando mensaje:", error);
        try {
          await message.reply("⚠️ Hubo un error procesando tu solicitud.");
        } catch {}
      }
    });

    /**
     * Poller: enviar mensajes aprobados (modo supervisado).
     * Se asegura de crear un solo interval por hotel.
     */
    ensureSinglePoller(hotelId, () =>
      setInterval(async () => {
        try {
          const messages = await getMessagesFromAstra(hotelId, "whatsapp");
          for (const msg of messages) {
            const shouldSend =
              msg.status === "sent" &&
              !!msg.approvedResponse &&
              msg.sender === "assistant" &&
              !msg.deliveredAt;

            if (!shouldSend) continue;

            const guestJid = msg.guestId;
            if (!guestJid) {
              console.warn("[whatsapp] guestId ausente para mensaje", msg.messageId);
              continue;
            }

            console.log(
              `[whatsapp] Enviando approvedResponse → guest=${guestJid} msgId=${msg.messageId}`
            );

            try {
              await client.sendMessage(guestJid, msg.approvedResponse!);
              await updateMessageInAstra(hotelId, msg.messageId, {
                deliveredAt: new Date().toISOString(),
                deliveryError: undefined,
                deliveryAttempts: (msg.deliveryAttempts || 0) + 1,
              });
              console.log(`[whatsapp] OK entregado msgId=${msg.messageId}`);
            } catch (error) {
              const attempts = (msg.deliveryAttempts || 0) + 1;
              const hardFail = attempts >= 5;
              await updateMessageInAstra(hotelId, msg.messageId, {
                deliveryError: String(error),
                deliveryAttempts: attempts,
                status: hardFail ? "rejected" : "sent",
              });
              console.error(
                `[whatsapp] ❌ Error entregando msgId=${msg.messageId} guest=${guestJid} (intent ${attempts}):`,
                error
              );
            }
          }
        } catch (err) {
          console.error("[whatsapp] Error en poller de aprobados:", err);
        }
      }, 5000)
    );

    // Inicializar cliente (si el wrapper no lo hace por su cuenta)
    try {
      client.initialize?.();
    } catch (err) {
      console.error("⛔ [whatsapp] Error en initialize():", err);
    }
  }
}

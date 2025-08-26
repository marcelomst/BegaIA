// Path: /root/begasist/lib/services/whatsapp.ts
import type { Message, MessageAck } from "whatsapp-web.js"; // type-only para evitar CJS en runtime
import { whatsappClient as client } from "./whatsappClient";
import qrcode from "qrcode-terminal";

import { parseWhatsAppToChannelMessage } from "@/lib/parsers/whatsappParser";
import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import {
  getMessagesFromAstra,
  updateMessageInAstra,
  saveMessageIdempotent,
} from "@/lib/db/messages";

import { setQR, clearQR, setWhatsAppState } from "@/lib/services/redis";
import { startChannelHeartbeat } from "@/lib/services/heartbeat";
import { normalizePhone } from "@/lib/config/hotelPhoneMap";
import { shouldIngestWaMessageOnce } from "@/lib/utils/waIdempotency";
import type { ChannelMessage } from "@/types/channel";

// Logs recortados
const preview = (s: string, n = 120) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * Nota: el control de grupos ahora es por hotel desde hotel_config.channelConfigs.whatsapp.ignoreGroups
 * (por defecto true si no está definido).
 */
export function startWhatsAppBot({
  hotelId,
  hotelPhone,
}: {
  hotelId: string;
  hotelPhone?: string;
}) {
  if (!hotelId) {
    console.warn("⚠️ [whatsapp] startWhatsAppBot llamado sin hotelId. Abortando init.");
    return;
  }

  // Evitar múltiples inicializaciones en dev/hot-reload
  const INIT_KEY = "__WA_INIT__";
  const POLLER_KEY = "__WA_POLLERS__" as const;
  type PollerMap = Record<string, NodeJS.Timeout>;

  // @ts-ignore - attach to global for dev
  if (!(globalThis as any)[POLLER_KEY]) (globalThis as any)[POLLER_KEY] = {};

  function ensureSinglePoller(hid: string, create: () => NodeJS.Timeout) {
    const map = (globalThis as any)[POLLER_KEY] as PollerMap;
    if (!map[hid]) map[hid] = create();
  }
  function clearPoller(hid: string) {
    const map = (globalThis as any)[POLLER_KEY] as PollerMap;
    if (map[hid]) {
      clearInterval(map[hid]);
      delete map[hid];
    }
  }

  // @ts-ignore
  if ((globalThis as any)[INIT_KEY]?.[hotelId]) {
    console.log(`↪️ [whatsapp] Ya inicializado para hotelId=${hotelId}, evitando doble init.`);
    return;
  }
  // @ts-ignore
  (globalThis as any)[INIT_KEY] = (globalThis as any)[INIT_KEY] || {};
  // @ts-ignore
  (globalThis as any)[INIT_KEY][hotelId] = true;

  // ───────────────────────────────────────────────────────────────────────────
  // Eventos de ciclo de vida (QR, auth, ready, disconnected)
  // ───────────────────────────────────────────────────────────────────────────
  client.on("qr", async (qr: string) => {
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

  client.on("auth_failure", async (msg: string) => {
    console.error(`❌ [whatsapp] auth_failure para hotelId=${hotelId}:`, msg);
    await setWhatsAppState(hotelId, "auth_failed");
  });

  client.on("disconnected", async (reason: string) => {
    console.warn(`❌ [whatsapp] Bot desconectado hotelId=${hotelId}: ${reason}`);
    await setWhatsAppState(hotelId, "disconnected");
    clearPoller(hotelId);
  });

  // ACKs salientes (telemetría de entrega)
  client.on("message_ack", (msg: Message, ack: MessageAck) => {
    console.log(
      `[whatsapp] 📬 ack hotel=${hotelId} id=${(msg as any).id._serialized} → ${ack} (0:error,1:server,2:device,3:read,4:played)`
    );
  });

  /**
   * Handler de mensaje entrante
   */
  client.on("message", async (message: Message) => {
    if ((message as any).fromMe) return;

    try {
      // Config por hotel
      const hotelConfig = await getHotelConfig(hotelId);
      const mode: "automatic" | "supervised" =
        hotelConfig?.channelConfigs?.whatsapp?.mode ?? "automatic";
      const ignoreGroups: boolean =
        hotelConfig?.channelConfigs?.whatsapp?.ignoreGroups ?? true;

      if (ignoreGroups && (message as any).from.endsWith("@g.us")) return;

      const srcMsgId = (message as any).id?._serialized || "";
      const body = (message as any).body || "";
      console.log(
        `📩 [whatsapp] IN hotel=${hotelId} msg=${srcMsgId} from=${(message as any).from} len=${body.length} "${preview(body)}"`
      );
      if (!srcMsgId) return;

      // Idempotencia 1/2: Redis (usando el cliente compartido de lib/services/redis)
      const firstTime = await shouldIngestWaMessageOnce(hotelId, srcMsgId);
      if (!firstTime) {
        console.log(`[whatsapp] 🔁 dedupe Redis → ignorado ${srcMsgId}`);
        return;
      }

      if (!hotelPhone) {
        console.warn(`⚠️ [whatsapp] hotelPhone no definido para hotelId=${hotelId}. Evito respuesta.`);
      }

      const senderJid = normalizePhone((message as any).from);

      // Parseo canal → evento unificado
      const parsed = await parseWhatsAppToChannelMessage({
        message: message as any,
        hotelId,
        guestId: senderJid,
      });

      const rawEvent: ChannelMessage & Record<string, any> = {
        ...parsed,
        channel: "whatsapp",
        hotelId,
        guestId: parsed.guestId || senderJid,
        sender: parsed.sender || senderJid,
        messageId: parsed.messageId || srcMsgId,
        content: parsed.content ?? body,
        timestamp:
        parsed.timestamp ||
        ((message as any).timestamp
          ? new Date((message as any).timestamp * 1000).toISOString()
          : new Date().toISOString()),
        conversationId:
          parsed.conversationId || `${hotelId}-whatsapp-${parsed.guestId || senderJid}`,
        status: parsed.status || "received",
      };

      // Idempotencia 2/2: DB (persistencia estable)
      const idempotencyKey = `${hotelId}:whatsapp:${srcMsgId}`;
      const saved = await saveMessageIdempotent(rawEvent, { idempotencyKey } as any);
      if ((saved as any)?.deduped) {
        console.log(`[whatsapp] 🔁 dedupe DB → ya existía ${srcMsgId}`);
      } else {
        console.log(`[whatsapp] 💾 guardado ${srcMsgId} conv=${rawEvent.conversationId}`);
      }

      // Handler universal (IA + supervisado)
      await universalChannelEventHandler(rawEvent, hotelId, {
        mode,
        sendReply: async (reply: string) => {
          try {
            if (!reply) return;
            const sent = await client.sendMessage(senderJid, reply);
            console.log(
              `[whatsapp] 📤 reply hotel=${hotelId} → ${senderJid} (msgId=${(sent as any).id._serialized}, size=${reply.length})`
            );
          } catch (err) {
            console.error("⛔ [whatsapp] Error enviando respuesta al usuario:", err);
          }
        },
      });
    } catch (error) {
      console.error("⛔ [whatsapp] Error procesando mensaje:", error);
      try {
        await (message as any).reply("⚠️ Hubo un error procesando tu solicitud.");
      } catch {}
    }
  });

  // Poller supervisado (approved responses)
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

  try {
    (client as any).initialize?.();
  } catch (err) {
    console.error("⛔ [whatsapp] Error en initialize():", err);
  }
}

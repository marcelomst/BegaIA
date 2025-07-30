// Path: /root/begasist/lib/services/whatsapp.ts

import { Message } from "whatsapp-web.js";
import { whatsappClient as client } from "./whatsappClient";
import { parseWhatsAppToChannelMessage } from "@/lib/parsers/whatsappParser";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { normalizePhone } from "@/lib/config/hotelPhoneMap";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getMessagesFromAstra, updateMessageInAstra } from "@/lib/db/messages";
import qrcode from "qrcode-terminal";
import { setQR, clearQR, setWhatsAppState } from "@/lib/services/redis";
import { startChannelHeartbeat } from "@/lib/services/heartbeat";

export function startWhatsAppBot({ hotelId, hotelPhone }: { hotelId: string, hotelPhone?: string }) {
  client.on("qr", async (qr) => {
    console.log("⚡ [whatsapp] Escaneá este código QR para conectar:");
    qrcode.generate(qr, { small: true });
    startChannelHeartbeat("whatsapp", hotelId);
    await setQR(hotelId, qr);
    await setWhatsAppState(hotelId, "waiting_qr");
  });

  client.on("ready", async () => {
    console.log("✅ [whatsapp] Bot de WhatsApp listo para recibir mensajes.");
    await clearQR(hotelId);
    await setWhatsAppState(hotelId, "connected");
  });

  client.on("disconnected", async (reason) => {
    console.warn(`❌ [whatsapp] Bot desconectado para hotelId=${hotelId}: ${reason}`);
    await setWhatsAppState(hotelId, "disconnected");
  });

  client.on("message", async (message: Message) => {
    try {
      console.log(`📩 [whatsapp] Mensaje recibido de ${message.from}: ${message.body}`);

      if (!hotelId) {
        console.warn(`⚠️ [whatsapp] Este proceso no tiene hotelId definido.`);
        return;
      }
      if (!hotelPhone) {
        console.warn(`⚠️ [whatsapp] Este proceso no tiene hotelPhone definido.`);
        return;
      }

      const senderJid = normalizePhone(message.from);
      const conversationId = `${hotelId}-whatsapp-${senderJid}`;
      const timestamp = new Date().toISOString();

      // Guest CRUD
      let guest = await getGuest(hotelId, senderJid);
      if (!guest) {
        guest = {
          guestId: senderJid,
          hotelId,
          name: "",
          mode: "automatic",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        await createGuest(guest);
        console.log(`👤 [whatsapp] Guest creado en Astra: ${senderJid}`);
      } else {
        await updateGuest(hotelId, senderJid, { updatedAt: timestamp });
      }

      // Conversation (opcional: puede ir dentro del handler si preferís)
      await getOrCreateConversation({
        conversationId,
        hotelId,
        channel: "whatsapp",
        guestId: senderJid,
        startedAt: timestamp,
        lastUpdatedAt: timestamp,
        lang: "es",
        status: "active",
        subject: "",
      });

      // --- 1. Parsear y manejar el mensaje centralmente ---
      const channelMsg = await parseWhatsAppToChannelMessage({ message, hotelId, guestId: senderJid });
      const hotelConfig = await getHotelConfig(hotelId);
      const mode = hotelConfig?.channelConfigs?.whatsapp?.mode ?? "automatic";

      await handleIncomingMessage(channelMsg, {
        autoReply: mode === "automatic",
        sendReply: async (reply: string) => {
          if (mode === "automatic") {
            await client.sendMessage(senderJid, reply);
          } else {
            await message.reply("🧍‍♂️ Un recepcionista está gestionando su consulta, en breve será respondida.");
          }
        },
        mode,
      });

    } catch (error) {
      console.error("⛔ [whatsapp] Error procesando mensaje:", error);
      try {
        await message.reply("⚠️ Hubo un error procesando tu solicitud.");
      } catch {}
    }
  });

  // Polling cada 5s para enviar mensajes aprobados por el admin
  setInterval(async () => {
    try {
      const messages = await getMessagesFromAstra(hotelId, "whatsapp");
      for (const msg of messages) {
        if (
          msg.status === "sent" &&
          msg.approvedResponse &&
          msg.sender === "assistant" &&
          !msg.deliveredAt
        ) {
          const guestJid = msg.guestId;
          if (!guestJid) {
            console.warn("guestId no definido para el mensaje", msg.messageId);
            continue;
          }
          console.log(`[whatsapp] Enviando respuesta aprobada a guest:`, guestJid, "msgId:", msg.messageId);

          try {
            await client.sendMessage(guestJid, msg.approvedResponse);
            await updateMessageInAstra(hotelId, msg.messageId, {
              deliveredAt: new Date().toISOString(),
              deliveryError: undefined,
              deliveryAttempts: (msg.deliveryAttempts || 0) + 1,
            });
            console.log(`[whatsapp] Mensaje ${msg.messageId} marcado como entregado (timestamp)`);
          } catch (error) {
            const attempts = (msg.deliveryAttempts || 0) + 1;
            await updateMessageInAstra(hotelId, msg.messageId, {
              deliveryError: String(error),
              deliveryAttempts: attempts,
              status: attempts >= 5 ? "rejected" : "sent",
            });
            console.error(`[whatsapp] ❌ Error enviando mensajeId ${msg.messageId} a ${guestJid} (intent ${attempts}):`, error);
          }
        }
      }
    } catch (err) {
      console.error("[whatsapp] Error en el poller de mensajes aprobados:", err);
    }
  }, 5000);

  client.initialize();
}

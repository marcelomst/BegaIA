// Path: /root/begasist/lib/services/whatsapp.ts
import { Message } from "whatsapp-web.js";
import { whatsappClient as client } from "./whatsappClient";
import { agentGraph } from "@/lib/agents";
import { HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { channelMemory } from "@/lib/services/channelMemory";
import { getLocalTime } from "@/lib/utils/time";
import { saveMessageToAstra, getMessagesFromAstra, updateMessageInAstra } from "@/lib/db/messages";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import qrcode from "qrcode-terminal";
import { setQR, clearQR, setWhatsAppState, getWhatsAppState, clearWhatsAppState } from "@/lib/services/redis";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { normalizePhone } from "@/lib/config/hotelPhoneMap";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";

export function startWhatsAppBot({ hotelId, hotelPhone }: { hotelId: string, hotelPhone?: string }) {
  client.on("qr", async (qr) => {
    console.log("⚡ [whatsapp] Escaneá este código QR para conectar:");
    qrcode.generate(qr, { small: true });
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

      const senderJid = normalizePhone(message.from); // e.g. "59891359375"
      const conversationId = `${hotelId}-whatsapp-${senderJid}`;
      const timestamp = new Date().toISOString();

      // 👉 CREAR O ACTUALIZAR GUEST AUTOMÁTICAMENTE
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
        // Actualiza el updatedAt
        await updateGuest(hotelId, senderJid, { updatedAt: timestamp });
      }

      const incoming = {
        messageId: uuidv4(),
        conversationId,
        hotelId,
        channel: "whatsapp" as const,
        sender: senderJid,
        guestId: senderJid,
        content: message.body,
        timestamp,
        time: await getLocalTime(hotelId, timestamp),
        suggestion: "",
        status: "pending" as const,
        role: "user" as const,
      };

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

      channelMemory.addMessage(incoming);
      await saveMessageToAstra(incoming);

      const hotelConfig = await getHotelConfig(hotelId);
      const mode = hotelConfig?.channelConfigs?.whatsapp?.mode ?? "automatic";

      console.log(`⚙️ [whatsapp] Modo de canal detectado: ${mode}`);

      const response = await agentGraph.invoke({
        hotelId,
        conversationId,
        messages: [new HumanMessage(message.body)],
      });

      const reply = response.messages.at(-1)?.content;

      if (typeof reply === "string" && reply.trim()) {
        const assistantMsg = {
          messageId: uuidv4(),
          conversationId,
          hotelId,
          channel: "whatsapp" as const,
          sender: "assistant",
          guestId: senderJid,
          content: reply,
          timestamp: new Date().toISOString(),
          time: await getLocalTime(hotelId, new Date().toISOString()),
          suggestion: reply,
          status: (mode === "automatic" ? "sent" : "pending") as "sent" | "pending",
          role: "ai" as const,
        };

        channelMemory.addMessage(assistantMsg);
        await saveMessageToAstra(assistantMsg);

        if (mode === "automatic") {
          await client.sendMessage(senderJid, reply);
        } else {
          await message.reply("🧍‍♂️ Un recepcionista está gestionando su consulta, en breve será respondida.");
        }
      } else {
        console.warn("⚠️ [whatsapp] Respuesta vacía o malformada.");
      }
    } catch (error) {
      console.error("⛔ [whatsapp] Error procesando mensaje:", error);
      try {
        await message.reply("⚠️ Hubo un error procesando tu solicitud.");
      } catch {}
    }
  });

  // Polling cada 5 segundos para enviar mensajes aprobados por el admin
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

// /lib/services/whatsapp.ts

import { Message } from "whatsapp-web.js";
import { whatsappClient as client } from "./whatsappClient";
import { agentGraph } from "@/lib/agents";
import { HumanMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import { channelMemory } from "@/lib/services/channelMemory";
import { getLocalTime } from "@/lib/utils/time";
import { getHotelIdByPhone } from "@/lib/config/hotelPhoneMap";
import { saveMessageToAstra } from "@/lib/db/messages";
import { getHotelConfig } from "@/lib/config/hotelConfig.server"; // 🔥 agregado
import qrcode from "qrcode-terminal";

export function startWhatsAppBot() {
  client.on("qr", (qr) => {
    console.log("⚡ [whatsapp] Escaneá este código QR para conectar:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("✅ [whatsapp] Bot de WhatsApp listo para recibir mensajes.");
  });

  client.on("message", async (message: Message) => {
    try {
      console.log(`📩 [whatsapp] Mensaje recibido de ${message.from}: ${message.body}`);

      const hotelPhone = message.to ?? "default";
      const hotelId = await getHotelIdByPhone(hotelPhone);

      if (!hotelId) {
        console.warn(`⚠️ [whatsapp] Número destino ${hotelPhone} no asociado a ningún hotel.`);
        return;
      }

      const senderPhone = message.from;
      const conversationId = `${hotelId}-whatsapp-${senderPhone}`;
      const timestamp = new Date().toISOString();

      const incoming = {
        messageId: uuidv4(),
        conversationId,
        hotelId,
        channel: "whatsapp" as const,
        sender: senderPhone,
        content: message.body,
        timestamp,
        time: await getLocalTime(hotelId, timestamp),
        suggestion: "",
        status: "pending" as const,
      };

      // 🧠 Guardamos el mensaje entrante
      channelMemory.addMessage(incoming);

      if (process.env.NODE_ENV !== "development") {
        await saveMessageToAstra(incoming);
      }

      // 🔥 Consultamos la configuración real del hotel
      const hotelConfig = await getHotelConfig(hotelId);
      const mode = hotelConfig?.channelConfigs?.whatsapp?.mode ?? "automatic"; // fallback automático si falta config

      console.log(`⚙️ [whatsapp] Modo de canal detectado: ${mode}`);

      // 🔵 Invocamos el grafo
      const response = await agentGraph.invoke({
        hotelId,
        conversationId,
        messages: [new HumanMessage(message.body)],
      });

      const reply = response.messages.at(-1)?.content;

      if (typeof reply === "string" && reply.trim()) {
        if (mode === "automatic") {
          // 🚀 Responder directamente
          await message.reply(reply);
          console.log(`📤 [whatsapp] Respuesta enviada a ${senderPhone}`);

          channelMemory.updateMessage("whatsapp", incoming.messageId, {
            suggestion: reply,
            status: "sent",
          });

          if (process.env.NODE_ENV !== "development") {
            await saveMessageToAstra({
              ...incoming,
              suggestion: reply,
              status: "sent",
            });
          }
        } else {
          // ✍️ Supervisado: Guardar sugerencia, pero NO responder todavía
          channelMemory.updateMessage("whatsapp", incoming.messageId, {
            suggestion: reply,
            status: "pending",
          });

          if (process.env.NODE_ENV !== "development") {
            await saveMessageToAstra({
              ...incoming,
              suggestion: reply,
              status: "pending",
            });
          }

          console.log("🧍 [whatsapp] Mensaje en modo supervisado. Pendiente de aprobación.");
        }
      } else {
        console.warn("⚠️ [whatsapp] Respuesta vacía o malformada.");
      }
    } catch (error) {
      console.error("⛔ [whatsapp] Error procesando mensaje:", error);
      await message.reply("⚠️ Hubo un error procesando tu solicitud.");
    }
  });

  client.initialize();
}

// lib/services/whatsapp.ts

import { Message } from "whatsapp-web.js";
import { whatsappClient as client } from "./whatsappClient";
import { agentGraph } from "../agents";
import { HumanMessage } from "@langchain/core/messages";
import qrcode from "qrcode-terminal";

export function startWhatsAppBot() {
  client.on("qr", (qr) => {
    console.log("⚡ [whatsapp] Escaneá este código QR para conectar:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("✅ [whatsapp] Bot listo para recibir mensajes.");
  });

  client.on("message", async (message: Message) => {
    try {
      console.log(`📩 [whatsapp] Mensaje recibido: ${message.body}`);

      const response = await agentGraph.invoke({
        messages: [new HumanMessage(message.body)],
      });

      const reply = response.messages.at(-1)?.content;

      if (typeof reply === "string" && reply.trim()) {
        await message.reply(reply);
        console.log(`📤 [whatsapp] Respuesta enviada.`);
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

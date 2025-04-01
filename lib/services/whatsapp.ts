// lib/services/whatsapp.ts

import { Message } from "whatsapp-web.js";
import { whatsappClient as client } from "./whatsappClient";
import { agentGraph } from "../agents";
import { HumanMessage } from "@langchain/core/messages";
import qrcode from "qrcode-terminal";

export function startWhatsappBot() {
  client.on("qr", (qr) => {
    console.log("⚡ Escaneá este código QR para conectar WhatsApp:");
    qrcode.generate(qr, { small: true }); // Renderiza el QR como imagen en consola
  });

  client.on("ready", () => {
    console.log("✅ Bot de WhatsApp listo!");
  });

  client.on("message", async (message: Message) => {
    try {
      console.log(`📩 Recibido: ${message.body}`);

      const response = await agentGraph.invoke({
        messages: [new HumanMessage(message.body)],
      });

      const reply = response.messages.at(-1)?.content;
      if (typeof reply === "string" && reply.trim()) {
        await message.reply(reply);
        console.log(`📤 Enviado: ${reply}`);
      } else {
        console.warn("⚠️ Formato inesperado:", response.messages.at(-1));
      }
    } catch (error) {
      console.error("⛔ Error procesando mensaje:", error);
      await message.reply("⚠️ Ocurrió un error procesando tu solicitud.");
    }
  });

  client.initialize();
}

import { Client, Message } from "whatsapp-web.js";
import { agentGraph } from "../agents";  // ✅ Ajustar ruta de importación
import { HumanMessage } from "@langchain/core/messages";

const client = new Client({
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
});

client.on("qr", (qr) => {
  console.log("⚡ Scan this QR code to connect WhatsApp:");
  console.log(qr);
});

client.on("ready", () => {
  console.log("✅ WhatsApp Bot is ready!");
});

client.on("message", async (message: Message) => {
  try {
    console.log(`📩 Received: ${message.body}`);

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(message.body)]
    });

    if (response.messages.length > 0) {
      const reply = response.messages[0].content;
      if (typeof reply === "string" && reply.trim() !== "") {
        message.reply(reply);
        console.log(`📤 Sent: ${reply}`);
      } else {
        console.error("⚠️ Unexpected response format:", response.messages[0]);
      }
    } else {
      console.warn("⚠️ No response from agent.");
    }
  } catch (error) {
    console.error("⛔ Error processing message:", error);
    message.reply("⚠️ Lo siento, hubo un problema procesando tu solicitud.");
  }
});

client.initialize();

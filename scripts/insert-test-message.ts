// /scripts/insert-test-message.ts

import { getCollection } from "../lib/db/messages";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const collection = getCollection();

  const testMessage = {
    messageId: uuidv4(),
    hotelId: "hotel123",
    channel: "web",
    sender: "user@example.com",
    content: "Mensaje de prueba para conversación.",
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }),
    suggestion: "Gracias por escribirnos. ¿En qué puedo ayudarte?",
    approvedResponse: undefined,
    respondedBy: undefined,
    status: "pending",
    conversationId: "test-convo-001",
  };

  try {
    await collection.insertOne(testMessage);
    console.log("✅ Mensaje de prueba insertado con éxito:", testMessage.messageId);
  } catch (err) {
    console.error("❌ Error al insertar el mensaje:", err);
  }
}

run();

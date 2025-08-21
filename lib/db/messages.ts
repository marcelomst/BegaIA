// Path: /root/begasist/lib/db/messages.ts

import { getAstraDB } from "@/lib/astra/connection";
import type { Channel } from "@/types/channel";
import type { ChannelMessage, MessageStatus } from "@/types/channel";

const MESSAGES_COLLECTION = "messages";
const COLLECTION = "messages";
function col() {
  return getAstraDB().collection<ChannelMessage & { _id?: string }>(COLLECTION);
}

/**
 * Guarda un mensaje de forma idempotente usando un _id canónico.
 * Si ya existe, NO inserta otro.
 */
export async function saveMessageIdempotent(
  msg: ChannelMessage,
  opts?: { idempotencyKey?: string }
): Promise<{ inserted: boolean; _id: string }> {
  const c = col();
  const _id =
    opts?.idempotencyKey ||
    // clave corta y estable: hotel + canal + id “externo” del mensaje
    `${msg.hotelId}:${msg.channel}:${msg.messageId}`;

  // Intentá insertOnly; si existe, no duplica
  const exists = await c.findOne({ _id });
  if (exists) return { inserted: false, _id };

  await c.insertOne({ ...msg, _id });
  return { inserted: true, _id };
}

export const getCollection = () => {
  return getAstraDB().collection<ChannelMessage>(MESSAGES_COLLECTION);
};

export async function saveMessageToAstra(message: ChannelMessage) {
  try {
    const collection = getCollection();
    await collection.insertOne(message);
    console.log("✅ Mensaje guardado en Astra DB:", message.messageId);
  } catch (err) {
    console.error("❌ Error guardando el mensaje en Astra DB:", err);
    throw err;
  }
}

export async function getMessagesFromAstra(hotelId: string, channel: Channel, limit = 100) {
  try {
    const collection = getCollection();
    const cursor = await collection.find(
      { hotelId, channel },
      { sort: { timestamp: -1 }, limit }
    );
    return await cursor.toArray();
  } catch (err) {
    console.error("❌ Error al obtener mensajes desde AstraDB:", err);
    throw err;
  }
}

export async function updateMessageInAstra(
  hotelId: string,
  messageId: string,
  changes: Partial<ChannelMessage>
) {
  try {
    const collection = getCollection();
    const result = await collection.updateOne(
      { hotelId, messageId },
      { $set: changes }
    );

    if (result.matchedCount === 0) {
      console.warn(`⚠️ No se encontró el mensaje ${messageId} para hotel ${hotelId}`);
      return false;
    }

    console.log("🔁 Mensaje actualizado en Astra DB:", messageId);
    return true;
  } catch (err) {
    console.error("❌ Error actualizando el mensaje en Astra DB:", err);
    throw err;
  }
}

export async function deleteMessageFromAstra(messageId: string) {
  try {
    const collection = getCollection();
    await collection.deleteOne({ messageId });
    console.log("🗑️ Mensaje eliminado de Astra DB:", messageId);
  } catch (err) {
    console.error("❌ Error eliminando el mensaje de Astra DB:", err);
    throw err;
  }
}

export async function getMessagesFromAstraByHotelId(hotelId: string) {
  try {
    const collection = getCollection();
    const cursor = await collection.find({ hotelId });
    return await cursor.toArray();
  } catch (err) {
    console.error("❌ Error al obtener mensajes desde AstraDB:", err);
    throw err;
  }
}

export async function getMessagesFromAstraByHotelIdAndChannel(hotelId: string, channel: Channel) {
  try {
    const collection = getCollection();
    const cursor = await collection.find({ hotelId, channel });
    return await cursor.toArray();
  } catch (err) {
    console.error("❌ Error al obtener mensajes desde AstraDB:", err);
    throw err;
  }
}

export async function deleteTestMessagesFromAstra() {
  try {
    const collection = getCollection();
    const cursor = await collection.find({});
    const allMessages = await cursor.toArray();

    const messageIdsToDelete = allMessages
      .filter((msg) => msg.messageId?.startsWith("test-") || msg.messageId?.startsWith("msg-"))
      .map((msg) => msg.messageId);

    if (messageIdsToDelete.length === 0) {
      console.log("ℹ️ No hay mensajes de prueba para eliminar.");
      return { deletedCount: 0 };
    }

    const result = await collection.deleteMany({ messageId: { $in: messageIdsToDelete } });
    console.log(`🧹 Mensajes de prueba eliminados: ${result.deletedCount}`);
    return result;
  } catch (err) {
    console.error("❌ Error al eliminar mensajes de prueba de Astra DB:", err);
    throw err;
  }
}

export async function getMessagesFromAstraByHotelIdAndChannelAndStatus(
  hotelId: string,
  channel: Channel,
  status: MessageStatus
) {
  try {
    const collection = getCollection();
    const cursor = await collection.find({ hotelId, channel, status });
    return await cursor.toArray();
  } catch (err) {
    console.error("❌ Error al obtener mensajes desde AstraDB:", err);
    throw err;
  }
}

export async function getMessagesFromAstraByHotelIdAndChannelAndSender(
  hotelId: string,
  channel: Channel,
  sender: string
) {
  try {
    const collection = getCollection();
    const cursor = await collection.find({ hotelId, channel, sender });
    return await cursor.toArray();
  } catch (err) {
    console.error("❌ Error al obtener mensajes desde AstraDB:", err);
    throw err;
  }
}

export async function getMessagesFromAstraByConversation(
  hotelId: string,
  channel: Channel,
  conversationId: string
) {
  try {
    const collection = getCollection();
    const cursor = await collection.find({ hotelId, channel, conversationId });
    return await cursor.toArray();
  } catch (err) {
    console.error("❌ Error al obtener mensajes por conversación desde Astra DB:", err);
    throw err;
  }
}

/**
 * Busca un mensaje por su originalMessageId para idempotencia (por ej: Message-ID del email recibido).
 * Devuelve el mensaje si existe, o null si no existe.
 * 
 * ⚠️ Asegurate de que guardás el campo originalMessageId en todos los ChannelMessage entrantes (email).
 */
export async function getMessageByOriginalId(originalMessageId: string): Promise<ChannelMessage | null> {
  try {
    const collection = getCollection();
    const doc = await collection.findOne({ originalMessageId });
    return doc || null;
  } catch (err) {
    console.error("❌ Error buscando mensaje por originalMessageId en Astra DB:", err);
    throw err;
  }
}

// /lib/db/messages.ts (refactorizado con tipado fuerte)

import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
import type { Message, MessageStatus } from "@/types/message";
import type { Channel } from "@/types/channel";

dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const MESSAGES_COLLECTION = "messages";

const getCollection = () => {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  return db.collection<Message>(MESSAGES_COLLECTION);
};

export async function saveMessageToAstra(message: Message) {
  try {
    const collection = getCollection();
    await collection.insertOne(message);
    console.log("✅ Mensaje guardado en Astra DB:", message.id);
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

export async function updateMessageInAstra(id: string, changes: Partial<Message>) {
  try {
    const collection = getCollection();
    await collection.updateOne({ id }, { $set: changes });
    console.log("🔁 Mensaje actualizado en Astra DB:", id);
  } catch (err) {
    console.error("❌ Error actualizando el mensaje en Astra DB:", err);
    throw err;
  }
}

export async function deleteMessageFromAstra(id: string) {
  try {
    const collection = getCollection();
    await collection.deleteOne({ id });
    console.log("🗑️ Mensaje eliminado de Astra DB:", id);
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

    const idsToDelete = allMessages
      .filter((msg) => msg.id?.startsWith("test-") || msg.id?.startsWith("msg-"))
      .map((msg) => msg.id);

    if (idsToDelete.length === 0) {
      console.log("ℹ️ No hay mensajes de prueba para eliminar.");
      return { deletedCount: 0 };
    }

    const result = await collection.deleteMany({ id: { $in: idsToDelete } });
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

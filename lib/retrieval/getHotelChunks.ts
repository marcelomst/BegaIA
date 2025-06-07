// /lib/retrieval/getHotelChunks.ts
import { getHotelAstraCollection } from "../astra/connection";

/**
 * Devuelve todos los chunks vectorizados para un hotel.
 * Se puede agregar paginación/límites.
 */
export async function getHotelChunks(hotelId: string, opts: { limit?: number } = {}) {
  const collection = getHotelAstraCollection(hotelId);
  // Podés limitar la cantidad si te preocupa el volumen
  const cursor = await collection.find({ hotelId }, { limit: opts.limit ?? 1000 });
  const docs = await cursor.toArray();
  return docs;
}

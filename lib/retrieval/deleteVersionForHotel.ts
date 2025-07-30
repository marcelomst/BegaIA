// Path: /root/begasist/lib/retrieval/deleteVersionForHotel.ts
import { getAstraDB } from "@/lib/astra/connection";
import { getCollectionName } from "./index";

/**
 * Elimina todos los documentos de una versión específica para un hotel.
 */
export async function deleteVersionForHotel(hotelId: string, version: string) {
  const db = getAstraDB();
  const collectionName = getCollectionName(hotelId);
  const collection = db.collection(collectionName);

  const result = await collection.deleteMany({ hotelId, version });
  return { deletedCount: result.deletedCount, version };
}

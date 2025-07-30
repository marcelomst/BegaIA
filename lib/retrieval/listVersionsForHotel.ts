// Path: /root/begasist/lib/retrieval/listVersionsForHotel.ts

import { getAstraDB } from "@/lib/astra/connection";

/**
 * Lista las versiones de documentos cargados para un hotel.
 * Devuelve versión, cantidad de chunks y fecha más reciente.
 */
export async function listVersionsForHotel(hotelId: string) {
  const db = getAstraDB();
  const collectionName = `${hotelId}_collection`;
  const collection = db.collection(collectionName);

  // 1. Traer solo los campos version y uploadedAt
  const cursor = await collection.find(
    { hotelId },
    { projection: { version: 1, uploadedAt: 1 } }
  );
  const allDocs = await cursor.toArray();

  // 2. Agrupar por versión en memoria
  const versionsMap: Record<string, { count: number; latestUploadedAt: string }> = {};
  for (const doc of allDocs) {
    const v = doc.version || "sin_version";
    if (!versionsMap[v]) {
      versionsMap[v] = { count: 1, latestUploadedAt: doc.uploadedAt };
    } else {
      versionsMap[v].count += 1;
      // Guardamos la fecha más nueva
      if (doc.uploadedAt && doc.uploadedAt > versionsMap[v].latestUploadedAt) {
        versionsMap[v].latestUploadedAt = doc.uploadedAt;
      }
    }
  }

  // 3. Devuelve como array ordenado descendente por fecha
  return Object.entries(versionsMap)
    .map(([version, data]) => ({
      version,
      numChunks: data.count,
      latestUploadedAt: data.latestUploadedAt,
    }))
    .sort((a, b) => b.latestUploadedAt.localeCompare(a.latestUploadedAt));
}

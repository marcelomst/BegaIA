// /lib/retrieval/listVersionsForHotel.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
dotenv.config();

export async function listVersionsForHotel(hotelId: string) {
  const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
  const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collectionName = `${hotelId}_collection`;
  const collection = await db.collection(collectionName);

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

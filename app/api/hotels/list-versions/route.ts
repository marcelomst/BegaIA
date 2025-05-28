// /lib/retrieval/listVersionsForHotel.ts
import { DataAPIClient } from "@datastax/astra-db-ts";
import { getCollectionName } from "@/lib/retrieval/index.ts";
import dotenv from "dotenv";
dotenv.config();


export async function listVersionsForHotel(hotelId: string) {
  const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
  const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(ASTRA_DB_URL!, { keyspace: ASTRA_DB_KEYSPACE! });
  const collectionName = getCollectionName(hotelId);
  const collection = await db.collection(collectionName);

  const docs = await collection.find({ hotelId },  { projection: { version: 1, uploadedAt: 1 } }).toArray();

  // Agrupa por version
  const versionMap: Record<string, string> = {};
  for (const d of docs) {
    // Guarda la fecha más reciente por version
    if (!versionMap[d.version] || d.uploadedAt > versionMap[d.version]) {
      versionMap[d.version] = d.uploadedAt;
    }
  }

  // Arma el array de versiones ordenadas
  const versions = Object.entries(versionMap)
    .map(([version, uploadedAt]) => ({ version, uploadedAt }))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)); // más reciente primero

  return versions;
}

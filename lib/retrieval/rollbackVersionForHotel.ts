// /lib/retrieval/rollbackVersionForHotel.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
dotenv.config();

export async function rollbackVersionForHotel(
  hotelId: string,
  sourceVersion: string,
  targetVersion?: string,   // opcional, si querés customizar el nombre
  restoredBy: string = "system"
) {
  const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
  const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collectionName = `${hotelId}_collection`;
  const collection = await db.collection(collectionName);

  // 1. Traer los chunks originales de la versión fuente
  const docs = await collection.find({ hotelId, version: sourceVersion }).toArray();
  if (!docs.length) throw new Error(`No hay chunks para version: ${sourceVersion}`);

  // 2. Definir nueva versión
  const now = new Date().toISOString();
  const newVersion =
    targetVersion ||
    "rollback-" + sourceVersion + "-" + now.slice(0, 10) + "-" + now.slice(11, 19).replace(/:/g, "");

  // 3. Clonar los chunks con nueva versión y nueva marca de fecha
  let inserted = 0;
  for (const doc of docs) {
    const {
      _id,    // nunca copiar _id
      ...rest
    } = doc;
    await collection.insertOne({
      ...rest,
      version: newVersion,
      uploadedAt: now,
      restoredFrom: sourceVersion,
      restoredBy,
    });
    inserted++;
  }

  return {
    ok: true,
     restoredChunks: inserted,
    newVersion,
  };
}

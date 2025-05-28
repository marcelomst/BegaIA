// /root/begasist/scripts/patch-chunks-add-version.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
dotenv.config();

const COLLECTION = "hotel999_collection"; // Cambia si quieres otra colección
const VERSION = "v1"; // O el valor de version que desees

async function main() {
  const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(process.env.ASTRA_DB_URL!, { keyspace: process.env.ASTRA_DB_KEYSPACE! });
  const collection = db.collection(COLLECTION);

  // Buscar todos los docs que NO tengan version
  const docs = await collection.find({ version: { $exists: false } }).toArray();

  console.log(`Encontrados ${docs.length} chunks sin version.`);

  for (const doc of docs) {
    // Actualiza con un valor por defecto
    await collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          version: VERSION,
          uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
        },
      }
    );
    console.log(`Actualizado chunk _id=${doc._id}`);
  }

  console.log("✅ Patch finalizado.");
}

main().catch(console.error);

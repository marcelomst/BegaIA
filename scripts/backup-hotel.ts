// /scripts/backup-hotel.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

// Hardcodeá aquí el hotel a respaldar
const HOTEL_ID = "hotel999";
const COLLECTION_NAME = `${HOTEL_ID}_collection`;
const BACKUP_FILE = `${HOTEL_ID}_backup.json`;

async function backupHotelCollection() {
  const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(process.env.ASTRA_DB_URL!, { keyspace: process.env.ASTRA_DB_KEYSPACE! });
  const collection = await db.collection(COLLECTION_NAME);

  console.log(`🔍 Leyendo documentos de la colección: ${COLLECTION_NAME} ...`);
  // ⚠️ Traemos todos los campos, incluyendo $vector
  const cursor = await collection.find({});
  const docs = await cursor.toArray();

  // DEBUG opcional: Verificá si $vector está presente
  const sample = docs[0];
  if (sample) {
    console.log(
      "Ejemplo de keys del primer doc:",
      Object.keys(sample)
    );
    console.log(
      "¿Contiene $vector?:",
      Object.prototype.hasOwnProperty.call(sample, "$vector")
    );
  }

  // Guardá todo el array en un archivo JSON (incluyendo $vector)
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(docs, null, 2), "utf-8");
  console.log(`✅ Backup guardado en '${BACKUP_FILE}' (${docs.length} documentos)`);
}

backupHotelCollection().catch((err) => {
  console.error("❌ Error haciendo backup:", err);
});

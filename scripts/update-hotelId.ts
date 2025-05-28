// scripts/update-hotelId.ts
/**
 * Script para actualizar todos los documentos con hotelId = 'hotel123' a 'hotel999'
 * en las colecciones principales de AstraDB.
 */

import { DataAPIClient, Collection } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });


// const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
// const keyspace = process.env.ASTRA_DB_KEYSPACE!;
const collections = [
  "messages",
  "hotel123_collection"
  // Si tuvieras más colecciones globales que usan hotelId, agrégalas aquí.
];

const OLD_HOTEL_ID = "hotel123";
const NEW_HOTEL_ID = "hotel999";

// Tipo genérico para documentos con hotelId y _id
type DocWithHotelId = {
  _id: string;
  hotelId: string;
  [key: string]: any;
};

// Actualiza hotelId en una colección
async function updateHotelIdInCollection(collectionName: string) {
//   const db = client.db(ASTRA_DB_KEYSPACE);
  const collection: Collection<DocWithHotelId> = db.collection<DocWithHotelId>(collectionName);

  // Busca todos los docs con hotelId viejo
  const docs = await collection.find({ hotelId: OLD_HOTEL_ID }).toArray();

  if (!docs.length) {
    console.log(`✅ No hay documentos para actualizar en ${collectionName}.`);
    return;
  }
  console.log(`🔄 Actualizando ${docs.length} documentos en ${collectionName}...`);

  // Actualiza cada doc por _id
  for (const doc of docs) {
    await collection.updateOne(
      { _id: doc._id },
      { $set: { hotelId: NEW_HOTEL_ID } }
    );
  }
  console.log(`✅ ${docs.length} documentos actualizados en ${collectionName}.`);
}

async function run() {
  for (const collectionName of collections) {
    try {
      await updateHotelIdInCollection(collectionName);
    } catch (err) {
      console.error(`⛔ Error actualizando ${collectionName}:`, err);
    }
  }
  console.log("🚀 Actualización completa.");
}

run();

// /root/begasist/scripts/clone-hotel-collection.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;

const SOURCE_COLLECTION = "hotel123_collection";
const TARGET_COLLECTION = "hotel999_collection";
const NEW_HOTEL_ID = "hotel999";

async function cloneHotelCollection() {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const source = db.collection(SOURCE_COLLECTION);
  const target = db.collection(TARGET_COLLECTION);

  // 🔥 Obtené todos los docs de la fuente
  const docs = await source.find({}).toArray();
  console.log(`📦 Documentos encontrados en ${SOURCE_COLLECTION}: ${docs.length}`);

  let copied = 0;
  for (const doc of docs) {
    // Cambiá el hotelId (si corresponde)
    doc.hotelId = NEW_HOTEL_ID;
    // Sugerencia: eliminá el _id así Astra genera uno nuevo (evita conflictos)
    if (doc._id) delete doc._id;

    await target.insertOne(doc);
    copied++;
    if (copied % 10 === 0) console.log(`→ Copiados: ${copied}`);
  }

  console.log(`✅ Completado: ${copied} documentos copiados de ${SOURCE_COLLECTION} a ${TARGET_COLLECTION}`);
}

cloneHotelCollection().catch((err) => {
  console.error("⛔ Error en la clonación:", err);
  process.exit(1);
});

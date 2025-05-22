// /scripts/fix-rolelevel-zero.ts
import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const COLLECTION = "hotel_config";

// Cambiá aquí el nuevo roleLevel (10 = Gerente, 20 = Recepcionista, etc.)
const NEW_ROLELEVEL = 10;

async function run() {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collection = db.collection(COLLECTION);

  const hotels = await collection.find({}).toArray();
  let cambios = 0;

  for (const hotel of hotels) {
    if (hotel.hotelId === "system") continue; // Solo corrige los NO system

    let changed = false;
    for (const user of hotel.users || []) {
      if (user.roleLevel === 0) {
        console.log(
          `Corrigiendo user ${user.email} (userId=${user.userId}) en hotel ${hotel.hotelId}: roleLevel 0 => ${NEW_ROLELEVEL}`
        );
        user.roleLevel = NEW_ROLELEVEL;
        changed = true;
        cambios++;
      }
    }
    if (changed) {
      await collection.updateOne({ hotelId: hotel.hotelId }, { $set: { users: hotel.users } });
      console.log(`✅ Actualizado hotelId ${hotel.hotelId}`);
    }
  }
  if (cambios === 0) {
    console.log("✔️ No se encontraron usuarios con roleLevel 0 fuera de 'system'.");
  } else {
    console.log(`🎉 Se corrigieron ${cambios} usuarios con roleLevel 0.`);
  }
}

run();

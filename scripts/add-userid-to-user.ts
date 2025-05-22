// /scripts/add-userid-to-user.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import { randomUUID } from "crypto";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const collectionName = "hotel_config";

async function run(email: string, hotelId: string) {
  if (!email || !hotelId) {
    console.error("Debe pasar: email hotelId");
    process.exit(1);
  }

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collection = db.collection(collectionName);

  const doc = await collection.findOne({ hotelId });
  if (!doc) {
    console.error(`No se encontró hotelId=${hotelId}`);
    process.exit(1);
  }

  let changed = false;
  const users = doc.users || [];
  for (let u of users) {
    if (u.email === email && !u.userId) {
      u.userId = randomUUID();
      changed = true;
      console.log(`Asignado userId=${u.userId} a usuario ${email} en hotelId=${hotelId}`);
    }
  }

  if (!changed) {
    console.log("No se hizo ningún cambio (quizá ya tenía userId)");
    return;
  }

  await collection.updateOne({ hotelId }, { $set: { users } });
  console.log(`✅ userId actualizado para ${email} en hotelId=${hotelId}`);
}

const [,, email, hotelId] = process.argv;
run(email, hotelId);

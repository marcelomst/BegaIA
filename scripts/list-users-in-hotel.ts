// /scripts/list-users-in-hotel.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const collectionName = "hotel_config";

async function run(hotelId: string) {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collection = db.collection(collectionName);

  const doc = await collection.findOne({ hotelId });
  if (!doc) {
    console.log(`No se encontró hotelId=${hotelId}`);
    return;
  }

  console.log(`HotelId: ${doc.hotelId}, hotelName: ${doc.hotelName}`);
  if (!Array.isArray(doc.users)) {
    console.log("No hay usuarios en este hotel.");
    return;
  }
  for (const user of doc.users) {
    console.log(user);
  }
}

const [,, hotelId] = process.argv;
run(hotelId);

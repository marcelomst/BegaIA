// /scripts/list-users-by-email.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const collectionName = "hotel_config";

async function run(email: string) {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collection = db.collection(collectionName);

  const cursor = await collection.find({ "users.email": email });
  const docs = await cursor.toArray();

  if (!docs.length) {
    console.log("No hay hoteles con ese email.");
    return;
  }

  for (const doc of docs) {
    console.log(`HotelId: ${doc.hotelId}, hotelName: ${doc.hotelName}`);
    for (const user of doc.users) {
      if (user.email === email) {
        console.log(user);
      }
    }
  }
}

const [,, email] = process.argv;
run(email);

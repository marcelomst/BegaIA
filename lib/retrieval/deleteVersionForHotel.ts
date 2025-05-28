// /lib/retrieval/deleteVersionForHotel.ts
import { DataAPIClient } from "@datastax/astra-db-ts";
import { getCollectionName } from "./index";
import dotenv from "dotenv";
dotenv.config();

export async function deleteVersionForHotel(hotelId: string, version: string) {
  const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
  const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
  const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(ASTRA_DB_URL!, { keyspace: ASTRA_DB_KEYSPACE! });
  const collectionName = getCollectionName(hotelId);
  const collection = await db.collection(collectionName);

  const result = await collection.deleteMany({ hotelId, version });
  return { deletedCount: result.deletedCount, version };
}

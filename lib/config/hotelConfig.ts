// /lib/config/hotelConfig.ts
import { DataAPIClient } from "@datastax/astra-db-ts";
import type { HotelConfig } from "@/types/channel";
import dotenv from "dotenv";
dotenv.config();


const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
console.log("DEBUG ASTRA_DB_URL", ASTRA_DB_URL); // 👈 esto debería mostrar una URL real

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
export const collection = db.collection("hotel_config");

export async function getHotelConfig(hotelId: string): Promise<HotelConfig | null> {
  const result = await collection.findOne({ hotelId });
  return result as HotelConfig | null;
}

export async function updateHotelConfig(hotelId: string, updates: Partial<HotelConfig>) {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collection = db.collection("hotel_config");

  const current = await collection.findOne({ hotelId });

  const merged = {
    ...current,
    ...updates,
    channelConfigs: {
      ...current?.channelConfigs,
      ...updates.channelConfigs,
    },
    lastUpdated: new Date().toISOString(),
  };

  // ❌ remover _id antes de hacer $set
  delete (merged as any)._id;

  await collection.updateOne({ hotelId }, { $set: merged }, { upsert: true });

  return merged;
}
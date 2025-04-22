// /lib/config/hotelConfig.server.ts
import { DataAPIClient } from "@datastax/astra-db-ts";

const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
export const collection = db.collection("hotel_config");

export type ChannelMode = "auto" | "supervised";

export type HotelChannelConfig = {
  mode: ChannelMode;
  enabled: boolean;
  [key: string]: any;
};

export type HotelConfig = {
  hotelId: string;
  channelConfigs: {
    [channel: string]: HotelChannelConfig;
  };
  lastUpdated?: string;
};

export async function getHotelConfig(hotelId: string): Promise<HotelConfig | null> {
  const result = await collection.findOne({ hotelId });
  return result as HotelConfig | null;
}

export async function updateHotelConfig(hotelId: string, updates: Partial<HotelConfig>) {
  const now = new Date().toISOString();
  await collection.updateOne(
    { hotelId },
    { $set: { ...updates, lastUpdated: now } },
    { upsert: true }
  );
}

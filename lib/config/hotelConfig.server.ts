// /lib/config/hotelConfig.server.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import { ChannelMode } from "@/types/channel"; // ✅ importar el tipo correcto
import type { HotelConfig } from "@/types/channel";
import dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
export const collection = db.collection("hotel_config");

export type HotelChannelConfig = {
  mode: ChannelMode; // ✅ usando el tipo importado
  enabled: boolean;
  [key: string]: any;
};


export async function getHotelConfig(hotelId: string): Promise<HotelConfig | null> {
  const result = await collection.findOne({ hotelId });
  return result as HotelConfig | null;
}
/**
 * Obtiene la lista completa de hoteles.
 */
export async function getAllHotelConfigs(): Promise<HotelConfig[]> {
  const result = await collection.find({}).toArray();

  // 🔥 Mapeamos y filtramos documentos válidos
  const configs: HotelConfig[] = result
  .filter(doc => doc.hotelId && doc.channelConfigs)
  .map(doc => ({
    hotelId: doc.hotelId,
    hotelName: doc.hotelName || "Unnamed Hotel",
    defaultLanguage: doc.defaultLanguage || "spa",
    timezone: doc.timezone || "UTC",
    channelConfigs: doc.channelConfigs || {},
    users: doc.users || [], // 👈 agregá esta línea
    lastUpdated: doc.lastUpdated || new Date().toISOString(),
  }));


  return configs;
}




export async function updateHotelConfig(hotelId: string, updates: Partial<HotelConfig>) {
  const now = new Date().toISOString();
  await collection.updateOne(
    { hotelId },
    { $set: { ...updates, lastUpdated: now } },
    { upsert: true }
  );
}

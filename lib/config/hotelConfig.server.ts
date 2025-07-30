// Path: /root/begasist/lib/config/hotelConfig.server.ts

import type { ChannelMode, HotelConfig } from "@/types/channel";
import { getAstraDB } from "@/lib/astra/connection";

// ✅ Ahora es un helper local, NO global.
export function getHotelConfigCollection() {
  return getAstraDB().collection("hotel_config");
}

export type HotelChannelConfig = {
  mode: ChannelMode;
  enabled: boolean;
  [key: string]: any;
};

// Obtiene la configuración de un hotel por su ID.
export async function getHotelConfig(hotelId: string): Promise<HotelConfig | null> {
  const collection = getHotelConfigCollection();
  const result = await collection.findOne({ hotelId });
  // ⚠️ fallback para iso3to1 si es system
  if (result && hotelId === "system" && !result.iso3to1) {
    result.iso3to1 = {
      spa: "es", eng: "en", fra: "fr", por: "pt", ita: "it",
      deu: "de", rus: "ru", nld: "nl",
      // Agregá los que uses
    };
  }
  // Asegura que channelConfigs existe (aunque vacío)
  if (result && !result.channelConfigs) result.channelConfigs = {};
  return result as HotelConfig | null;
}

// Lista completa de hoteles (garantiza channelConfigs existe)
export async function getAllHotelConfigs(): Promise<HotelConfig[]> {
  const collection = getHotelConfigCollection();
  const result = await collection.find({}).toArray();

  return result
    .filter(doc => doc.hotelId)
    .map(doc => ({
      hotelId: doc.hotelId,
      hotelName: doc.hotelName || "Unnamed Hotel",
      defaultLanguage: doc.defaultLanguage || "es",
      timezone: doc.timezone || "UTC",
      channelConfigs: doc.channelConfigs || {},
      users: doc.users || [],
      lastUpdated: doc.lastUpdated || new Date().toISOString(),
      iso3to1: doc.iso3to1 || undefined,
      verification: doc.verification || undefined,
      retrievalSettings: doc.retrievalSettings || undefined,
      country: doc.country,
      city: doc.city,
      address: doc.address,
      postalCode: doc.postalCode,
      phone: doc.phone,
    }));
}

// Actualiza la configuración de un hotel por su ID.
export async function updateHotelConfig(hotelId: string, updates: Partial<HotelConfig>) {
  const collection = getHotelConfigCollection();
  const current = await collection.findOne({ hotelId });

  // Merge profundo solo en channelConfigs
  const merged = {
    ...current,
    ...updates,
    channelConfigs: {
      ...current?.channelConfigs,
      ...updates.channelConfigs,
    },
    lastUpdated: new Date().toISOString(),
  };

  // ❌ remover _id antes de hacer $set para evitar conflictos en AstraDB/Mongo
  delete (merged as any)._id;

  await collection.updateOne({ hotelId }, { $set: merged }, { upsert: true });

  return merged;
}

export async function deleteHotelConfig(hotelId: string) {
  const collection = getHotelConfigCollection();
  await collection.deleteOne({ hotelId });
}

export async function createHotelConfig(hotelConfig: HotelConfig) {
  const collection = getHotelConfigCollection();
  // ❌ remover _id antes de insertar
  delete (hotelConfig as any)._id;
  await collection.insertOne(hotelConfig);
  return hotelConfig;
} 
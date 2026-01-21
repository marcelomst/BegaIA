// Path: /root/begasist/lib/config/hotelConfig.server.ts

import type { ChannelMode, HotelConfig } from "@/types/channel";
import { getAstraDB } from "@/lib/astra/connection";

// Tipado laxo del documento crudo en Astra (puede traer _id, metadata, etc.)
type HotelConfigDoc = Record<string, any>;

// ✅ Colección tipada a documento laxo
export function getHotelConfigCollection() {
  return getAstraDB().collection<HotelConfigDoc>("hotel_config");
}

export type HotelChannelConfig = {
  mode: ChannelMode;
  enabled: boolean;
  [key: string]: any;
};

// --- utils: merge profundo y sanitización ---
function isPlainObject(v: any): v is Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v);
}

function deepMerge<T extends Record<string, any>>(base: T, updates: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(updates || {})) {
    const uVal: any = (updates as any)[key];
    const bVal: any = (base as any)[key];

    if (Array.isArray(uVal)) {
      out[key] = [...uVal];
    } else if (isPlainObject(uVal) && isPlainObject(bVal)) {
      out[key] = deepMerge(bVal, uVal);
    } else {
      out[key] = uVal;
    }
  }
  return out;
}

/**
 * Normaliza un documento crudo de Astra a un HotelConfig estricto.
 * Evita casts peligrosos (WithSim<FoundDoc<...>> → HotelConfig).
 */
function sanitizeHotelConfig(doc: HotelConfigDoc): HotelConfig {
  const cfg: HotelConfig = {
    hotelId: String(doc.hotelId),
    hotelName: doc.hotelName ?? "Unnamed Hotel",
    defaultLanguage: doc.defaultLanguage ?? "es",
    timezone: doc.timezone ?? "UTC",
    channelConfigs: doc.channelConfigs ?? {},
    users: doc.users ?? [],
    lastUpdated: doc.lastUpdated ?? new Date().toISOString(),
    iso3to1: doc.iso3to1 ?? undefined,
    verification: doc.verification ?? undefined,
    retrievalSettings: doc.retrievalSettings ?? undefined,
    country: doc.country,
    city: doc.city,
    address: doc.address,
    postalCode: doc.postalCode,
    phone: doc.phone,
    reservations: doc.reservations ?? {},
    // Campos extendidos
    amenities: doc.amenities ?? undefined,
    billing: doc.billing ?? undefined,
    contacts: doc.contacts ?? undefined,
    payments: doc.payments ?? undefined,
    policies: doc.policies ?? undefined,
    rooms: doc.rooms ?? undefined,
    schedules: doc.schedules ?? undefined,
    attractions: doc.attractions ?? undefined,
    attractionsInfo: doc.attractionsInfo ?? undefined,
    hotelProfile: doc.hotelProfile ?? undefined,
    // Puedes agregar aquí otros campos que quieras exponer
  };
  return cfg;
}

// Obtiene la configuración de un hotel por su ID (sanitizada).
export async function getHotelConfig(hotelId: string): Promise<HotelConfig | null> {
  const collection = getHotelConfigCollection();
  const raw = await collection.findOne({ hotelId }); // <- tipo laxo

  if (!raw) return null;

  // Fallback iso3to1 si es system
  if (hotelId === "system" && !raw.iso3to1) {
    raw.iso3to1 = {
      spa: "es", eng: "en", fra: "fr", por: "pt", ita: "it",
      deu: "de", rus: "ru", nld: "nl",
    };
  }
  if (!raw.channelConfigs) raw.channelConfigs = {};
  if (!("reservations" in raw)) raw.reservations = {};

  return sanitizeHotelConfig(raw);
}

// Lista completa de hoteles (sanitizada).
export async function getAllHotelConfigs(): Promise<HotelConfig[]> {
  const collection = getHotelConfigCollection();
  const result = await collection.find({}).toArray(); // HotelConfigDoc[]

  return result
    .filter(doc => doc.hotelId)
    .map((doc) => sanitizeHotelConfig(doc));
}

// Actualiza la configuración de un hotel por su ID (merge profundo).
export async function updateHotelConfig(hotelId: string, updates: Partial<HotelConfig>) {
  const collection = getHotelConfigCollection();
  const current = await collection.findOne({ hotelId }); // HotelConfigDoc | null

  // Base actual normalizada (asegurando estructuras)
  const base: HotelConfigDoc = {
    ...(current || {}),
    channelConfigs: current?.channelConfigs || {},
    reservations: current?.reservations || {},
  };

  // Merge profundo (incluye reservations y channelConfigs.*.reservations)
  const mergedDeep = deepMerge(base, updates as Record<string, any>);
  mergedDeep.lastUpdated = new Date().toISOString();

  // ❌ remover _id antes de hacer $set para evitar conflictos
  if (mergedDeep._id) delete mergedDeep._id;

  await collection.updateOne({ hotelId }, { $set: mergedDeep }, { upsert: true });

  // Devolvemos tipado estricto
  return sanitizeHotelConfig(mergedDeep);
}

export async function deleteHotelConfig(hotelId: string) {
  const collection = getHotelConfigCollection();
  await collection.deleteOne({ hotelId });
}

export async function createHotelConfig(hotelConfig: HotelConfig) {
  const collection = getHotelConfigCollection();

  const doc: HotelConfigDoc = {
    ...hotelConfig,
    channelConfigs: hotelConfig.channelConfigs || {},
    reservations: (hotelConfig as any).reservations || {},
    lastUpdated: hotelConfig.lastUpdated || new Date().toISOString(),
  };

  if (doc._id) delete doc._id;

  await collection.insertOne(doc);
  return sanitizeHotelConfig(doc);
}

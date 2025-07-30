// /lib/config/hotelPhoneMap.ts

import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

type HotelPhoneCache = Record<string, string>; // phone@c.us -> hotelId

export function normalizePhone(phone: string): string {
  // Borra no-dígitos y agrega @c.us
  return phone.replace(/\D/g, "") + "@c.us";
}

async function initHotelPhoneCache(): Promise<void> {
  if (globalThis.__hotel_phone_map__) return;
  const allHotels = await getAllHotelConfigs();
  const phoneMap: HotelPhoneCache = {};
  for (const hotel of allHotels) {
    // Busca solo en channelConfigs.whatsapp
    const number = hotel.channelConfigs?.whatsapp?.celNumber;
    if (number) {
      phoneMap[normalizePhone(number)] = hotel.hotelId;
    }
  }
  globalThis.__hotel_phone_map__ = phoneMap;
  console.log(`📞 HotelPhoneCache inicializado con ${Object.keys(phoneMap).length} teléfonos.`);
}

export async function getHotelIdByPhone(phone: string): Promise<string | undefined> {
  if (!globalThis.__hotel_phone_map__) {
    await initHotelPhoneCache();
  }
  // Busca exacto (ej: 59898835914@c.us)
  const normalized = normalizePhone(phone);
  return globalThis.__hotel_phone_map__?.[normalized];
}

// ✅ Agregado: exportar la función debugHotelPhoneMap
export function debugHotelPhoneMap() {
  if (!globalThis.__hotel_phone_map__) {
    console.log("📞 HotelPhoneCache aún no inicializado.");
    return;
  }
  console.log("📞 HotelPhoneCache actual:");
  for (const [phone, hotelId] of Object.entries(globalThis.__hotel_phone_map__)) {
    console.log(`  📍 ${phone} ➔ ${hotelId}`);
  }
}

declare global {
  // @ts-ignore
  var __hotel_phone_map__: HotelPhoneCache | undefined;
}

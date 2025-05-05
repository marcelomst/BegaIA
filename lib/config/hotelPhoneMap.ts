import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server"; // ✅ corregimos import

type HotelPhoneCache = Record<string, string>; // phone -> hotelId

async function initHotelPhoneCache(): Promise<void> {
  if (globalThis.__hotel_phone_map__) return;

  const allHotels = await getAllHotelConfigs(); // ✅ ahora sí, obtener todos los hoteles

  const phoneMap: HotelPhoneCache = {};

  for (const hotel of allHotels) {
    if (hotel.whatsappSettings?.number) {
      const normalized = normalizePhone(hotel.whatsappSettings.number);
      phoneMap[normalized] = hotel.hotelId;
    }
  }

  globalThis.__hotel_phone_map__ = phoneMap;
  console.log(`📞 HotelPhoneCache inicializado con ${Object.keys(phoneMap).length} teléfonos.`);
}

export async function getHotelIdByPhone(phone: string): Promise<string | undefined> {
  if (!globalThis.__hotel_phone_map__) {
    await initHotelPhoneCache();
  }

  const normalized = normalizePhone(phone);
  return globalThis.__hotel_phone_map__?.[normalized];
}

export async function refreshHotelPhoneCache(): Promise<void> {
  delete globalThis.__hotel_phone_map__;
  await initHotelPhoneCache();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "") + "@c.us";
}

declare global {
  var __hotel_phone_map__: HotelPhoneCache | undefined;
}

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

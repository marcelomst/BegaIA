// /lib/config/hotelLanguage.ts
import { getHotelConfig } from "./hotelConfig";

/**
 * Devuelve el idioma nativo configurado para el hotel (formato ISO 639-3, ej: "spa", "eng").
 * Si no está definido, retorna "spa" como fallback.
 */
export async function getHotelLanguage(hotelId: string): Promise<string> {
  try {
    const config = await getHotelConfig(hotelId);
    const lang = config?.defaultLanguage;

    // Solo aceptamos formatos ISO 639-3
    const iso639_3 = /^[a-z]{3}$/;
    if (lang && iso639_3.test(lang)) {
      return lang;
    }
    return "spa"; // fallback
  } catch (err) {
    console.error("❌ Error obteniendo idioma del hotel:", err);
    return "spa";
  }
}

/**
 * Devuelve el timezone configurado para el hotel.
 * Si no está definido, retorna "UTC" como fallback.
 */
export async function getHotelTimezone(hotelId: string): Promise<string> {
  try {
    const config = await getHotelConfig(hotelId);
    return config?.timezone || "UTC";
  } catch (err) {
    console.error("❌ Error obteniendo timezone del hotel:", err);
    return "UTC";
  }
}

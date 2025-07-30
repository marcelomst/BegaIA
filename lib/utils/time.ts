// Path: /root/begasist/lib/utils/time.ts

import { getHotelTimezone } from "@/lib/config/hotelLanguage";
import { DateTime } from "luxon";

/**
 * Convierte un timestamp ISO UTC a la hora local del hotel.
 * 
 * Si ya tenés el timezone del hotel, pasalo como tercer parámetro para evitar una consulta extra.
 * Por defecto retorna solo la hora local (HH:mm). Para incluir fecha y hora usá el cuarto parámetro.
 * 
 * @param hotelId     ID del hotel
 * @param timestamp   Timestamp ISO (UTC)
 * @param tzOptional  (opcional) Timezone del hotel
 * @param showDate    (opcional) true para incluir fecha, false por defecto (solo hora)
 * @returns           Hora local (ej: "14:23") o fecha y hora (ej: "11 jul 2024, 14:23")
 */
export async function getLocalTime(
  hotelId: string,
  timestamp: string,
  tzOptional?: string,
  showDate: boolean = false
): Promise<string> {
  try {
    // Usa el timezone recibido o lo busca por hotelId
    const timezone = tzOptional || await getHotelTimezone(hotelId);
    const date = DateTime.fromISO(timestamp, { zone: "utc" }).setZone(timezone);

    if (showDate) {
      // Ejemplo de formato: "11 jul 2024, 14:23"
      return date.setLocale("es").toLocaleString(DateTime.DATETIME_MED);
    }
    // Solo hora: "14:23"
    return date.toLocaleString(DateTime.TIME_24_SIMPLE);
  } catch (error) {
    console.error("❌ Error convirtiendo hora local:", error);
    return timestamp;
  }
}

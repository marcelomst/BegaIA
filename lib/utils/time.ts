// /lib/utils/time.ts

import { getHotelTimezone } from "@/lib/config/hotelLanguage";
import { DateTime } from "luxon";

/**
 * Convierte un timestamp ISO UTC a la hora local del hotel.
 */
export async function getLocalTime(hotelId: string, timestamp: string): Promise<string> {
  try {
    const timezone = await getHotelTimezone(hotelId);
    const localTime = DateTime.fromISO(timestamp, { zone: "utc" })
      .setZone(timezone)
      .toLocaleString(DateTime.TIME_24_SIMPLE); // ej: 14:23

    return localTime;
  } catch (error) {
    console.error("❌ Error convirtiendo hora local:", error);
    return timestamp;
  }
}

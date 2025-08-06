// Path: /root/begasist/lib/config/hotelLanguage.ts

import { getHotelConfig } from "./hotelConfig.server";

/**
 * Devuelve el idioma nativo principal configurado para el hotel.
 */
export async function getHotelNativeLanguage(hotelId: string): Promise<string> {
  const config = await getHotelConfig(hotelId);
  return config?.defaultLanguage || "en";
}

/**
 * Devuelve la zona horaria configurada para el hotel.
 * Si no está definida, retorna "UTC" por defecto.
 */
export async function getHotelTimezone(hotelId: string): Promise<string> {
  const config = await getHotelConfig(hotelId);
  // Campo típico: config.timezone || config.hotelTimezone, adaptá según tu modelo
  return config?.timezone || "UTC";
}

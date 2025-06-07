// /lib/utils/lang.ts

import { getHotelConfig } from "@/lib/config/hotelConfig.server";

/**
 * Devuelve el mapping ISO 639-3 → ISO 639-1 centralizado.
 * Busca en la config del hotelId 'system'.
 * Si no existe, retorna un mapping mínimo de ejemplo como fallback.
 */
export async function getIso3to1Map(): Promise<Record<string, string>> {
  const config = await getHotelConfig("system");
  return config?.iso3to1 || {
    spa: "es",
    eng: "en",
    fra: "fr",
    por: "pt",
    ita: "it",
    deu: "de",
    rus: "ru",
    nld: "nl",
    // Agregá más si usás otros idiomas
  };
}

/**
 * Convierte un código ISO 639-3 (ej: 'spa') a ISO 639-1 ('es').
 * Si no encuentra mapping, retorna "es" como fallback.
 */
export async function iso3To1(code3: string): Promise<string> {
  const map = await getIso3to1Map();
  return map[code3] || "es";
}

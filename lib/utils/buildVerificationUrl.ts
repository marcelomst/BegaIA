// /root/begasist/lib/utils/buildVerificationUrl.ts
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function buildVerificationUrl(path: string, token: string, hotelId: string): Promise<string> {
  const config = await getHotelConfig(hotelId);
  if (!config) {
    throw new Error(`❌ Configuración del hotel no encontrada para hotelId: ${hotelId}`);
  }
  const base = config.verification?.baseUrl || process.env.DEFAULT_VERIFICATION_URL_BASE;
  if (!base) {
    throw new Error("❌ No se definió ninguna base URL para verificación.");
  }
  return `${base.replace(/\/$/, "")}/${path}?token=${token}`;
}

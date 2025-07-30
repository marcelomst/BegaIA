// Path: /root/begasist/lib/entrypoints/all.ts

import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";
import { startHotelBot } from "@/lib/entrypoints/channelBot";

/**
 * Inicia un proceso/bot por hotel activo, cada uno lanza sus canales configurados.
 * Se ejecuta una vez al levantar el backend.
 */
async function main() {
  const hotels = await getAllHotelConfigs();
  console.log(`[all.ts] 🚀 Lanzando bots para ${hotels.length} hoteles...`);
  for (const h of hotels) {
    // Si querés, agregá un campo h.active o similar para pausar hoteles "borrados"
    try {
      await startHotelBot(h.hotelId);
    } catch (err) {
      console.error(`[all.ts] ❌ Error lanzando channelBot para ${h.hotelId}:`, err);
    }
  }
  console.log("[all.ts] ✅ Todos los hoteles inicializados.");
}

main();

// /scripts/init-config.ts
import { initHotelConfig } from "@/lib/config/initHotelConfig";

(async () => {
  const result = await initHotelConfig("hotel123");
  console.log("🛠️ Configuración inicial cargada:", result);
})();

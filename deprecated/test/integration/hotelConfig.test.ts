// /root/begasist/test/integration/hotelConfig.test.ts
import { describe, it, expect } from "vitest";
import { updateHotelConfig, getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { HotelConfig } from "@/types/channel";

describe("🧪 Configuración dinámica de canales", () => {
  it("permite agregar un canal dinámico como 'tiktok' sin romper la estructura", async () => {
    const hotelId = "hotel123";

    const configUpdate: Partial<HotelConfig> = {
      channelConfigs: {
        tiktok: { enabled: true, mode: "supervised" }
      } as Record<string, any> // 👈 esto permite propiedades dinámicas
    };

    await updateHotelConfig(hotelId, configUpdate);

    const config = await getHotelConfig(hotelId);
    const tiktokConfig = (config?.channelConfigs as Record<string, any>)["tiktok"];

    expect(tiktokConfig).toBeDefined();
    expect(tiktokConfig.enabled).toBe(true);
    expect(tiktokConfig.mode).toBe("supervised");
  });
});

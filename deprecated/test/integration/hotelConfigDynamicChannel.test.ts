// /test/integration/hotelConfigDynamicChannel.test.ts
import { describe, it, expect } from "vitest";
import { updateHotelConfig, getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { HotelConfig } from "@/types/channel";

describe("🧪 Configuración dinámica de canales", () => {
  it("permite agregar un canal dinámico como 'tiktok'", async () => {
    const hotelId = "hotel123";

    // 👇 Forzamos tipado relajado para canales no predefinidos
    const configUpdate: Partial<HotelConfig> = {
      channelConfigs: {
        ...( {
          tiktok: { enabled: true, mode: "supervised" }
        } as any )
      }
    };

    await updateHotelConfig(hotelId, configUpdate);
    const config = await getHotelConfig(hotelId);

    const tiktok = (config?.channelConfigs as any)?.tiktok;
    expect(tiktok).toBeDefined();
    expect(tiktok.enabled).toBe(true);
    expect(tiktok.mode).toBe("supervised");
  });
});

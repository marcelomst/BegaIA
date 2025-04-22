// /root/begasist/test/integration/hotelConfig.test.ts
import { describe, it, expect } from "vitest";
import { getHotelConfig, updateHotelConfig, HotelConfig } from "@/lib/config/hotelConfig";

describe("Hotel Config (Astra DB)", () => {
  it("actualiza y recupera la configuración de canales para hotel123", async () => {
    const hotelId = "hotel123";

    const configUpdate: Partial<HotelConfig> = {
        channelConfigs: {
          web: { enabled: true, mode: "supervised" },
          whatsapp: { enabled: true, mode: "supervised" },
        },
      };
      
      await updateHotelConfig(hotelId, configUpdate);
      

    // Paso 2: recuperar config
    const config = await getHotelConfig(hotelId);

    expect(config).not.toBeNull();
    expect(config?.hotelId).toBe(hotelId);
    expect(config?.channelConfigs.web.enabled).toBe(true);
    expect(config?.channelConfigs.web.mode).toBe("supervised");
    expect(config?.channelConfigs.whatsapp.enabled).toBe(true);
    expect(config?.channelConfigs.whatsapp.mode).toBe("supervised");
    expect(typeof config?.lastUpdated).toBe("string");
    
  });
});

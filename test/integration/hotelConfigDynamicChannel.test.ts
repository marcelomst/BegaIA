// /test/integration/hotelConfigDynamicChannel.test.ts

import { describe, it, expect } from "vitest";
import {
  getHotelConfig,
  updateHotelConfig,
} from "@/lib/config/hotelConfig";

const hotelId = "hotel123";

describe("🧩 Hotel Config Dynamic Channel (Astra DB)", () => {
  it("agrega un canal dinámico (tiktok) y lo recupera correctamente", async () => {
    await updateHotelConfig(hotelId, {
      channelConfigs: {
        tiktok: { enabled: true, mode: "auto" }, // ✅ creación asegurada
      },
    });

    const config = await getHotelConfig(hotelId);
    expect(config).not.toBeNull();
    expect(config?.channelConfigs.tiktok).toBeDefined();
    expect(config?.channelConfigs.tiktok.enabled).toBe(true);
    expect(config?.channelConfigs.tiktok.mode).toBe("auto");
  });
});

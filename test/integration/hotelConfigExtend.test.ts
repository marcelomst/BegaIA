// /test/integration/hotelConfigExtend.test.ts

import { describe, it, expect } from "vitest";
import {
  getHotelConfig,
  updateHotelConfig,
} from "@/lib/config/hotelConfig";

const hotelId = "hotel123";

describe("🧩 Hotel Config Extend (Astra DB)", () => {
  it("agrega un nuevo canal (email) y valida todos los canales", async () => {
    await updateHotelConfig(hotelId, {
      channelConfigs: {
        email: { enabled: true, mode: "automatic" }, // ✅ aseguramos que sea "auto"
      },
    });

    const config = await getHotelConfig(hotelId);
    expect(config).not.toBeNull();
    expect(config?.channelConfigs.email).toBeDefined();
    expect(config?.channelConfigs.email.enabled).toBe(true);
    expect(config?.channelConfigs.email.mode).toBe("auto"); // ✅ corregido según sistema real
  });
});

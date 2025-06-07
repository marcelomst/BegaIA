// /test/integration/hotelConfigExtend.test.ts

import { describe, it, expect } from "vitest";
import {
  getHotelConfig,
  updateHotelConfig,
} from "@/lib/config/hotelConfig.server"

const hotelId = "hotel123";

describe("🧩 Hotel Config Extend (Astra DB)", () => {
  it("agrega un nuevo canal (email) y valida todos los canales", async () => {
    await updateHotelConfig(hotelId, {
      channelConfigs: {
        email: {
          enabled: true,
          mode: "automatic",
          dirEmail: "hotel@example.com",
          password: "secret-password",      // <-- Obligatorio!
          imapHost: "imap.example.com",
          smtpHost: "smtp.example.com",
          imapPort: 993,
          smtpPort: 587,
          // secure: false, // opcional
          // checkInterval: 15000, // opcional
        },
      },
    });

    const config = await getHotelConfig(hotelId);
    expect(config).not.toBeNull();
    expect(config?.channelConfigs.email?.enabled).toBe(true);
    expect(config?.channelConfigs.email?.mode).toBe("automatic");
    expect(config?.channelConfigs.email?.dirEmail).toBe("hotel@example.com");
    expect(config?.channelConfigs.email?.password).toBe("secret-password");
  });
});

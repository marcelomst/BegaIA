// /test/integration/getAllHotelConfigs.test.ts

import { describe, it, expect } from "vitest";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";
import dotenv from "dotenv";
dotenv.config(); // 🧪 cargar .env antes de hacer cualquier otra cosa


describe("getAllHotelConfigs()", () => {
  it("debería devolver una lista de configuraciones de hotel válidas", async () => {
    const hotels = await getAllHotelConfigs();

    expect(Array.isArray(hotels)).toBe(true);
    for (const hotel of hotels) {
      expect(typeof hotel.hotelId).toBe("string");
      expect(typeof hotel.hotelName).toBe("string");
      expect(typeof hotel.defaultLanguage).toBe("string");
      expect(typeof hotel.timezone).toBe("string");
      expect(typeof hotel.channelConfigs).toBe("object");
      expect(hotel.channelConfigs).not.toBeNull();
    }
  });
});

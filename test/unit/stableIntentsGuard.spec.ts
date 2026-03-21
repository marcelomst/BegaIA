import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: { checkIn: "15:00", checkOut: "11:00", breakfast: "07:00 - 10:30" },
    amenities: {
      wifiNotes: "Wi-Fi gratis en todo el hotel. La clave se entrega al hacer check-in.",
      parkingNotes: "Estacionamiento sujeto a disponibilidad en el predio.",
    },
  })),
}));

import {
  __stableIntentsForTest,
  runStableIntentsGuard,
} from "@/lib/handlers/pipeline/stableIntentsGuard";

describe("stableIntentsGuard", () => {
  it("normaliza variantes simples de check-in con typo liviano", () => {
    expect(__stableIntentsForTest.normalizeStableIntentInput("a que hora es el check iin")).toContain("checkin");
    expect(__stableIntentsForTest.normalizeStableIntentInput("check-in?")).toBe("checkin");
  });

  it("sin conversationId, reconoce FAQ estable de check-in y responde determinísticamente", async () => {
    const result = await runStableIntentsGuard({
      rawQuery: "a que hora es el check iin",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });

    expect(result.matched).toBe(true);
    expect(result.intentKey).toBe("faq_check_in_time");
    expect(String(result.response || "")).toMatch(/15:00/);
  });

  it("reconoce breakfast/wifi/parking con respuestas deterministas", async () => {
    const breakfast = await runStableIntentsGuard({
      rawQuery: "incluye desayuno?",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });
    const wifi = await runStableIntentsGuard({
      rawQuery: "wifi password?",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });
    const parking = await runStableIntentsGuard({
      rawQuery: "hay parking",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });

    expect(breakfast.intentKey).toBe("faq_breakfast_hours");
    expect(String(breakfast.response || "")).toMatch(/07:00 - 10:30|desayuno/i);
    expect(wifi.intentKey).toBe("faq_wifi");
    expect(String(wifi.response || "")).toMatch(/wifi|wi-fi|clave/i);
    expect(parking.intentKey).toBe("faq_parking");
    expect(String(parking.response || "")).toMatch(/estacionamiento|parking/i);
  });

  it("mantiene matching conservador para frases transaccionales enriquecidas", async () => {
    const parking = await runStableIntentsGuard({
      rawQuery: "quiero reservar con parking",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });
    const wifi = await runStableIntentsGuard({
      rawQuery: "necesito wifi para trabajar durante mi estadía",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });

    expect(parking.matched).toBe(false);
    expect(wifi.matched).toBe(false);
  });

  it("no secuestra un intent transaccional de reserva", async () => {
    const result = await runStableIntentsGuard({
      rawQuery: "quiero reservar una habitación para mañana",
      hotelId: "hotel999",
      preferredLanguage: "es",
      conversationId: "conv-stable-negative-helper-1",
    });

    expect(result.matched).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: { checkIn: "15:00", checkOut: "11:00" },
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

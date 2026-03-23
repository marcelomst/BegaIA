import { beforeEach, describe, expect, it, vi } from "vitest";

const { getHotelConfigMock } = vi.hoisted(() => ({
  getHotelConfigMock: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: { checkIn: "15:00", checkOut: "11:00", breakfast: "07:00 - 10:30" },
    amenities: {
      wifiNotes: "Wi-Fi gratis en todo el hotel. La clave se entrega al hacer check-in.",
      parkingNotes: "Estacionamiento sujeto a disponibilidad en el predio.",
    },
  })),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));

import {
  __stableIntentsForTest,
  runStableIntentsGuard,
} from "@/lib/handlers/pipeline/stableIntentsGuard";

describe("stableIntentsGuard", () => {
  beforeEach(() => {
    getHotelConfigMock.mockReset();
    getHotelConfigMock.mockResolvedValue({
      hotelName: "Hotel Demo",
      schedules: { checkIn: "15:00", checkOut: "11:00", breakfast: "07:00 - 10:30" },
      amenities: {
        wifiNotes: "Wi-Fi gratis en todo el hotel. La clave se entrega al hacer check-in.",
        parkingNotes: "Estacionamiento sujeto a disponibilidad en el predio.",
      },
    });
  });

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
    expect(result.routingDecision).toBe("served");
    expect(result.policySource).toBe("default_catalog");
    expect(String(result.response || "")).toMatch(/15:00/);
  });

  it("reconoce breakfast horario, wifi básico y parking con respuestas deterministas", async () => {
    const breakfast = await runStableIntentsGuard({
      rawQuery: "desayuno?",
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

  it("distingue desayuno incluido y modalidad sin colapsarlos a horario puro", async () => {
    const included = await runStableIntentsGuard({
      rawQuery: "el desayuno está incluido?",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });
    const buffet = await runStableIntentsGuard({
      rawQuery: "el desayuno es buffet?",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });

    expect(included.intentKey).toBe("faq_breakfast_included");
    expect(String(included.response || "")).toMatch(/incluido|tarifa|recepci/i);
    expect(String(included.response || "")).not.toMatch(/^el desayuno se sirve de 07:00 - 10:30\.?$/i);
    expect(buffet.intentKey).toBe("faq_breakfast_type");
    expect(String(buffet.response || "")).toMatch(/buffet|modalidad|recepci/i);
    expect(String(buffet.response || "")).not.toMatch(/^el desayuno se sirve de 07:00 - 10:30\.?$/i);
  });

  it("distingue wifi contextual de wifi básico", async () => {
    const contextual = await runStableIntentsGuard({
      rawQuery: "necesito wifi para trabajar",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });
    const freeWifi = await runStableIntentsGuard({
      rawQuery: "hay wifi gratis?",
      hotelId: "hotel999",
      preferredLanguage: "es",
    });

    expect(contextual.intentKey).toBe("faq_wifi_quality");
    expect(String(contextual.response || "")).toMatch(/trabajar|estabilidad|cobertura|wifi/i);
    expect(freeWifi.intentKey).toBe("faq_wifi");
    expect(String(freeWifi.response || "")).toMatch(/wifi|wi-fi/i);
  });

  it("captura parking con temporalidad suave sin tratarlo como agenda", async () => {
    const queries = [
      "quiero parking para mañana",
      "necesito parking mañana",
      "hay parking mañana?",
    ];

    for (const rawQuery of queries) {
      const result = await runStableIntentsGuard({
        rawQuery,
        hotelId: "hotel999",
        preferredLanguage: "es",
      });

      expect(result.matched).toBe(true);
      expect(result.intentKey).toBe("faq_parking");
      expect(String(result.response || "")).toMatch(/estacionamiento|parking/i);
    }
  });

  it("mantiene matching conservador para parking transaccional y captura wifi contextual", async () => {
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
    expect(wifi.matched).toBe(true);
    expect(wifi.intentKey).toBe("faq_wifi_quality");
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

  it("respeta un intent habilitado por hotel con metadata mínima", async () => {
    getHotelConfigMock.mockResolvedValueOnce({
      hotelName: "Hotel Demo",
      schedules: { checkIn: "16:00", checkOut: "11:00" },
      semanticPolicy: {
        stableIntents: {
          faq_check_in_time: {
            enabled: true,
            responseSource: "schedules.checkIn",
            notes: "Horario operativo del hotel",
            examples: ["check-in?"],
          },
        },
      },
    });

    const result = await runStableIntentsGuard({
      rawQuery: "check in?",
      hotelId: "hotel-enabled",
      preferredLanguage: "es",
    });

    expect(result.matched).toBe(true);
    expect(result.intentKey).toBe("faq_check_in_time");
    expect(String(result.response || "")).toMatch(/16:00/);
  });

  it("no responde como stable intent cuando el hotel lo deshabilita", async () => {
    getHotelConfigMock.mockResolvedValueOnce({
      hotelName: "Hotel Demo",
      schedules: { checkIn: "15:00" },
      semanticPolicy: {
        stableIntents: {
          faq_check_in_time: {
            enabled: false,
            responseSource: "schedules.checkIn",
          },
        },
      },
    });

    const result = await runStableIntentsGuard({
      rawQuery: "a que hora es el check in",
      hotelId: "hotel-disabled",
      preferredLanguage: "es",
    });

    expect(result.matched).toBe(false);
    expect(result.response).toBeUndefined();
    expect(result.detectedIntentKey).toBe("faq_check_in_time");
    expect(result.routingDecision).toBe("blocked_by_policy");
    expect(result.policySource).toBe("hotel_config.semanticPolicy.stableIntents");
  });

  it("usa fallback backward compatible cuando el hotel no define semanticPolicy", async () => {
    getHotelConfigMock.mockResolvedValueOnce({
      hotelName: "Hotel Demo",
      schedules: { checkIn: "14:00", checkOut: "10:00", breakfast: "06:30 - 10:00" },
    });

    const result = await runStableIntentsGuard({
      rawQuery: "desayuno?",
      hotelId: "hotel-fallback",
      preferredLanguage: "es",
    });

    expect(result.matched).toBe(true);
    expect(result.intentKey).toBe("faq_breakfast_hours");
    expect(result.routingDecision).toBe("served");
    expect(String(result.response || "")).toMatch(/06:30 - 10:00|desayuno/i);
  });
});

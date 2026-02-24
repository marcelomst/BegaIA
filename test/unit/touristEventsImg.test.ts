import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

const stderrSpy = vi.hoisted(() => {
  const orig = process.stderr.write.bind(process.stderr);
  return vi.spyOn(process.stderr, "write").mockImplementation(((chunk: any, ...args: any[]) => {
    const s = typeof chunk === "string" ? chunk : chunk?.toString?.() ?? "";
    if (s.includes("[events]")) return true;
    return orig(chunk, ...(args as any));
  }) as any);
});

vi.mock("@/lib/utils/debugLog", () => ({
  debugLog: () => { },
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke() {
      return { content: "stub" };
    }
  },
}));

vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(),
}));

vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(),
}));

vi.mock("@/lib/astra/connection", () => ({
  getHotelAstraCollection: vi.fn(() => ({
    find: () => ({
      async *[Symbol.asyncIterator]() { },
      close: () => { },
    }),
  })),
}));

vi.mock("@/lib/retrieval", () => ({
  searchFromAstra: vi.fn(async () => ["stub"]),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    timezone: "America/Montevideo",
    city: "Piriápolis",
  })),
}));

let retrievalBased: any;
let searchEvents: any;
let searchNearbyPlaces: any;

describe("tourist_events_img carousel", () => {
  beforeAll(async () => {
    ({ retrievalBased } = await import("@/lib/agents/retrieval_based"));
    ({ searchEvents } = await import("@/lib/poi/searchEvents"));
    ({ searchNearbyPlaces } = await import("@/lib/media/googlePlaces"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    stderrSpy.mockRestore();
  });

  it("renders text and only includes items with images", async () => {
    (searchEvents as any).mockResolvedValue([
      {
        name: "Evento A",
        startsAt: "2026-01-31T20:30:00.000Z",
        endsAt: "2026-01-31T21:30:00.000Z",
        location: {
          locality: "Piriápolis",
          mapsUrl: "https://maps.google.com/?q=Evento%20A%20Piriapolis",
        },
        sourceUrl: "https://a.test",
      },
      {
        name: "Evento B",
        startsAt: "2026-01-31T22:00:00.000Z",
        endsAt: "2026-01-31T23:00:00.000Z",
        location: { locality: "Maldonado", address: "Av. Principal 123" },
        sourceUrl: "",
      },
    ]);
    (searchNearbyPlaces as any)
      .mockResolvedValueOnce([{ name: "Lugar A", photoName: "photos/abc" }])
      .mockResolvedValueOnce([]);

    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos hoy",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos hoy")],
      nowISO: "2026-01-31T12:00:00.000Z",
    } as any);

    const msg = res?.messages?.[res.messages.length - 1]?.content || "";
    const carousel = res?.meta?.rich?.carousel || [];
    expect(carousel.length).toBe(1);
    expect(carousel[0].title).toBe("Evento A");
    expect(carousel[0].images?.[0]?.url || "").toContain("/api/places/photo?name=");
    if (msg) {
      expect(msg).toContain("Evento A");
    }
  });

  it("does not fail when no images are found", async () => {
    (searchEvents as any).mockResolvedValue([
      {
        name: "Evento C",
        startsAt: "2026-01-31T18:00:00.000Z",
        endsAt: "2026-01-31T19:00:00.000Z",
        location: { locality: "Piriápolis", address: "Centro" },
      },
    ]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos hoy",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos hoy")],
      nowISO: "2026-01-31T12:00:00.000Z",
    } as any);

    const carousel = res?.meta?.rich?.carousel;
    expect(carousel === undefined || (Array.isArray(carousel) && carousel.length === 0)).toBe(true);
  });

  it("returns human text and debug reason when no events are found", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos hoy en Piriápolis",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos hoy en Piriápolis")],
    } as any);

    const msg = res?.messages?.[res.messages.length - 1]?.content || "";
    expect(msg).toContain("# Eventos");
    expect(msg).toContain("No encontré eventos");
  });

  it("triggers events intent for EN query", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "Tourist events this weekend in Punta del Este",
      retrievalLang: "en",
      originalLang: "en",
      messages: [new HumanMessage("Tourist events this weekend in Punta del Este")],
    } as any);

    expect(searchEvents).toHaveBeenCalled();
  });

  it("triggers events intent for PT query", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "Eventos turísticos este fim de semana em Punta del Este",
      retrievalLang: "pt",
      originalLang: "pt",
      messages: [new HumanMessage("Eventos turísticos este fim de semana em Punta del Este")],
    } as any);

    expect(searchEvents).toHaveBeenCalled();
  });

  it("tourist_events_img still routes to events pipeline for ES price query", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "precio fin de semana",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("precio fin de semana")],
    } as any);

    expect(searchEvents).toHaveBeenCalled();
  });

  it("tourist_events_img still routes to events pipeline for EN price query", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "weekend price",
      retrievalLang: "en",
      originalLang: "en",
      messages: [new HumanMessage("weekend price")],
    } as any);

    expect(searchEvents).toHaveBeenCalled();
  });

  it("tourist_events_img still routes to events pipeline for PT price query", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "preço fim de semana",
      retrievalLang: "pt",
      originalLang: "pt",
      messages: [new HumanMessage("preço fim de semana")],
    } as any);

    expect(searchEvents).toHaveBeenCalled();
  });

  it("uses local day range for ES 'hoy'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos hoy",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos hoy")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-02", to: "2026-02-02" })
    );
    vi.useRealTimers();
  });

  it("uses local day range for EN 'today'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "events today",
      retrievalLang: "en",
      originalLang: "en",
      messages: [new HumanMessage("events today")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-02", to: "2026-02-02" })
    );
    vi.useRealTimers();
  });

  it("uses local day range for PT 'hoje'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos hoje",
      retrievalLang: "pt",
      originalLang: "pt",
      messages: [new HumanMessage("eventos hoje")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-02", to: "2026-02-02" })
    );
    vi.useRealTimers();
  });

  it("uses hourly range for ES 'esta noche'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos esta noche",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos esta noche")],
    } as any);

    const call = (searchEvents as any).mock.calls[0]?.[0] || {};
    expect(call.from).toContain("T");
    expect(call.from).toMatch(/Z$/);
    expect(call.to).toContain("T");
    expect(call.to).toMatch(/Z$/);
    expect(new Date(call.from).getTime()).toBeLessThan(new Date(call.to).getTime());
    vi.useRealTimers();
  });

  it("uses hourly range for EN 'tonight'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "events tonight",
      retrievalLang: "en",
      originalLang: "en",
      messages: [new HumanMessage("events tonight")],
    } as any);

    const call = (searchEvents as any).mock.calls[0]?.[0] || {};
    expect(call.from).toContain("T");
    expect(call.from).toMatch(/Z$/);
    expect(call.to).toContain("T");
    expect(call.to).toMatch(/Z$/);
    expect(new Date(call.from).getTime()).toBeLessThan(new Date(call.to).getTime());
    vi.useRealTimers();
  });

  it("uses hourly range for PT 'esta noite'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos esta noite",
      retrievalLang: "pt",
      originalLang: "pt",
      messages: [new HumanMessage("eventos esta noite")],
    } as any);

    const call = (searchEvents as any).mock.calls[0]?.[0] || {};
    expect(call.from).toContain("T");
    expect(call.from).toMatch(/Z$/);
    expect(call.to).toContain("T");
    expect(call.to).toMatch(/Z$/);
    expect(new Date(call.from).getTime()).toBeLessThan(new Date(call.to).getTime());
    vi.useRealTimers();
  });

  it("uses weekend range for ES 'fin de semana'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos fin de semana",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos fin de semana")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-07", to: "2026-02-08" })
    );
    vi.useRealTimers();
  });

  it("uses weekend range for EN 'weekend'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "events weekend",
      retrievalLang: "en",
      originalLang: "en",
      messages: [new HumanMessage("events weekend")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-07", to: "2026-02-08" })
    );
    vi.useRealTimers();
  });

  it("uses weekend range for PT 'fim de semana'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos fim de semana",
      retrievalLang: "pt",
      originalLang: "pt",
      messages: [new HumanMessage("eventos fim de semana")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-07", to: "2026-02-08" })
    );
    vi.useRealTimers();
  });

  it("uses next-day range for ES 'mañana'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos mañana",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos mañana")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-03", to: "2026-02-03" })
    );
    vi.useRealTimers();
  });

  it("uses next-day range for EN 'tomorrow'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "events tomorrow",
      retrievalLang: "en",
      originalLang: "en",
      messages: [new HumanMessage("events tomorrow")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-03", to: "2026-02-03" })
    );
    vi.useRealTimers();
  });

  it("uses next-day range for PT 'amanhã'", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));
    (searchEvents as any).mockResolvedValue([]);
    (searchNearbyPlaces as any).mockResolvedValue([]);

    await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos amanhã",
      retrievalLang: "pt",
      originalLang: "pt",
      messages: [new HumanMessage("eventos amanhã")],
    } as any);

    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-02-03", to: "2026-02-03" })
    );
    vi.useRealTimers();
  });
});

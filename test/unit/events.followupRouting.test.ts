import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/nodes/reservationSnapshot", () => ({ handleReservationSnapshotNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/reservationVerify", () => ({ handleReservationVerifyNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/amenities", () => ({ handleAmenitiesNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/billing", () => ({ handleBillingNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/support", () => ({ handleSupportNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/retrieval", () => ({ retrievalBasedNode: vi.fn() }));
vi.mock("@/lib/agents/nodes", () => ({ handleReservationNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/cancelReservation", () => ({ handleCancelReservationNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/reservationModify", () => ({
  askModifyFieldNode: vi.fn(),
  askNewValueNode: vi.fn(),
  confirmModificationNode: vi.fn(),
}));
let lastIntentGroup: string | null = "events";
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => ({ lastIntentGroup, lastEventCity: "Piriápolis" })),
}));
vi.mock("@/lib/classifier", () => ({ classifyQuery: vi.fn() }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));

import { classifyNode } from "@/lib/agents/graph";

describe("events follow-up routing", () => {
  const prevDebugRouting = process.env.DEBUG_ROUTING;

  beforeEach(() => {
    process.env.DEBUG_ROUTING = "1";
    lastIntentGroup = "events";
  });

  afterEach(() => {
    if (prevDebugRouting === undefined) delete process.env.DEBUG_ROUTING;
    else process.env.DEBUG_ROUTING = prevDebugRouting;
  });

  it("routes short follow-up with photos to tourist_events_img", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿Y con fotos?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(res.promptKey).toBe("tourist_events_img");
    expect(res.meta?.debug?.route_source).toBe("heuristic_events_followup");
  });

  it("does not hijack support intents after events context", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿Cómo los contacto?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("support");
    expect(res.promptKey).toBe("contact_support");
    expect(res.meta?.debug?.route_source).toBe("heuristic_support");
  });

  it("does not hijack billing intents after events context", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿Qué medios de pago aceptan?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("billing");
    expect(res.promptKey).toBe("payments_and_billing");
    expect(res.meta?.debug?.route_source).toBe("heuristic_billing");
  });

  it("does not hijack amenities intents after events context", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿Qué amenities tienen?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("amenities");
    expect(res.promptKey).toBe("amenities_list");
    expect(res.meta?.debug?.route_source).toBe("heuristic_amenities");
  });

  it("routes to events from non-events memory when user asks explicit events", async () => {
    lastIntentGroup = "support";
    const res = await classifyNode({
      normalizedMessage: "¿Qué eventos hay este fin de semana?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(res.promptKey).toBe("tourist_events");
    expect(res.meta?.debug?.route_source).toBe("heuristic_events");
  });

  it("does not hijack transport intents after events context", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿Cómo llego desde el aeropuerto?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(res.promptKey).toBe("arrivals_transport");
    expect(res.meta?.debug?.route_source).toBe("heuristic_transport");
  });

  it("does not hijack breakfast intents after events context", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿A qué hora es el desayuno?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("amenities");
    expect(res.promptKey).toBe("breakfast_bar");
    expect(res.meta?.debug?.route_source).toBe("heuristic_breakfast");
  });

  it("routes channel availability question to contact_channel_selector", async () => {
    const res = await classifyNode({
      normalizedMessage: "¿Por qué canal me conviene contactarlos?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("support");
    expect(res.promptKey).toBe("contact_channel_selector");
    expect(res.meta?.debug?.route_source).toBe("heuristic_contact_channel_selector");
  });

  it("routes unavailable-channel question to contact_channel_selector", async () => {
    const res = await classifyNode({
      normalizedMessage: "Si WhatsApp no está disponible, ¿qué canal usan?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("support");
    expect(res.promptKey).toBe("contact_channel_selector");
  });

  it("routes out-of-hours contact question to contact_channel_selector", async () => {
    const res = await classifyNode({
      normalizedMessage: "Fuera de horario, ¿por qué canal responden?",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("support");
    expect(res.promptKey).toBe("contact_channel_selector");
  });
});

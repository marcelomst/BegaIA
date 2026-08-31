// Path: /root/begasist/test/e2e.reservation.golden-transcripts.spec.ts
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const channelManagerMock = vi.hoisted(() => ({
  searchAvailability: vi.fn(),
  createReservation: vi.fn(),
}));

vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(),
  upsertConvState: vi.fn(),
}));

vi.mock("@/lib/mcp/channelManagerAdapter", () => ({
  getCMProvider: () => "test-double",
  getCMAdapter: () => ({
    searchAvailability: channelManagerMock.searchAvailability,
    createReservation: channelManagerMock.createReservation,
  }),
}));

vi.mock("@/lib/agents/reservations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agents/reservations")>("@/lib/agents/reservations");
  return {
    ...actual,
    fillSlotsWithLLM: vi.fn(),
  };
});

import { agentGraph } from "@/lib/agents/graph";
import { POST as mcpPOST } from "@/app/api/mcp/route";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { fillSlotsWithLLM } from "@/lib/agents/reservations";

type AnyObj = Record<string, any>;

function mkReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("reservation golden transcripts", () => {
  const hotelId = "hotel999";
  const convStateStore = new Map<string, AnyObj>();
  const mcpCalls: AnyObj[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    convStateStore.clear();
    mcpCalls.length = 0;
    channelManagerMock.searchAvailability.mockResolvedValue([
      { roomType: "double", description: "Hab. Doble", pricePerNight: 100, currency: "USD", availability: 4 },
    ]);
    channelManagerMock.createReservation.mockImplementation(async (input: AnyObj) => ({
      reservationId: "RES-GOLDEN-001",
      hotelId: input.hotelId,
      roomType: input.roomType,
      guestName: input.guestName,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      status: "confirmed",
      currency: "USD",
      priceTotal: 200,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }));

    (getConvState as any).mockImplementation(async (h: string, c: string) => {
      return convStateStore.get(`${h}:${c}`) ?? null;
    });

    (upsertConvState as any).mockImplementation(async (h: string, c: string, patch: AnyObj) => {
      const key = `${h}:${c}`;
      const prev = convStateStore.get(key) ?? { hotelId: h, conversationId: c };
      const next: AnyObj = { ...prev, ...patch };
      if (Object.prototype.hasOwnProperty.call(patch, "reservationSlots")) {
        const pSlots = patch.reservationSlots;
        if (pSlots && typeof pSlots === "object" && Object.keys(pSlots).length > 0) {
          next.reservationSlots = { ...(prev.reservationSlots ?? {}), ...pSlots };
        } else {
          next.reservationSlots = pSlots ?? {};
        }
      }
      convStateStore.set(key, next);
      return next;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const pathname = new URL(url).pathname;
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      if (pathname === "/api/mcp") {
        if (body?.action === "call") mcpCalls.push(body);
        return mcpPOST(mkReq(url, body) as any);
      }
      throw new Error(`Unhandled fetch in test: ${url}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("T1: direct full reservation -> quote + confirm -> createReservation", async () => {
    const conversationId = "golden-t1";
    (fillSlotsWithLLM as any).mockImplementation(async (text: string) => {
      if (String(text).includes("Quiero reservar")) {
        return {
          need: "none",
          slots: {
            guestName: "Ana Gomez",
            roomType: "double",
            guests: 2,
            checkIn: "2026-10-10",
            checkOut: "2026-10-12",
            locale: "es",
          },
        };
      }
      return { need: "question", question: "¿Cuál es el nombre completo?" };
    });

    const step1 = await agentGraph.invoke({
      normalizedMessage: "Quiero reservar doble del 10/10/2026 al 12/10/2026 para 2, soy Ana Gomez",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });
    expect(String(step1.messages?.[0]?.content)).toMatch(/CONFIRMAR/i);
    expect((convStateStore.get(`${hotelId}:${conversationId}`)?.reservationSlots?.guestName || "")).toBe("Ana Gomez");

    const step2 = await agentGraph.invoke({
      normalizedMessage: "CONFIRMAR",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });
    expect(String(step2.messages?.[0]?.content)).toMatch(/Reserva confirmada|reserva creada/i);

    const callNames = mcpCalls.map((c) => c?.name);
    expect(callNames).toContain("searchAvailability");
    expect(callNames).toContain("createReservation");
    const createCall = mcpCalls.find((c) => c?.name === "createReservation");
    expect(createCall?.params?.hotelId).toBe(hotelId);
    expect(createCall?.params?.roomType).toBe("double");
  });

  it("T2: missing name -> follow-up -> confirm", async () => {
    const conversationId = "golden-t2";
    (fillSlotsWithLLM as any).mockImplementation(async (text: string) => {
      const t = String(text);
      if (t.includes("del 10/11/2026 al 12/11/2026")) {
        return {
          need: "question",
          partial: { roomType: "double", checkIn: "2026-11-10", checkOut: "2026-11-12", numGuests: 2, locale: "es" },
          question: "¿Cuál es el nombre completo?",
        };
      }
      if (t.includes("Carlos Ruiz")) {
        return {
          need: "none",
          slots: {
            guestName: "Carlos Ruiz",
            roomType: "double",
            guests: 2,
            checkIn: "2026-11-10",
            checkOut: "2026-11-12",
            locale: "es",
          },
        };
      }
      return { need: "question", question: "¿Cuál es el nombre completo?" };
    });

    const step1 = await agentGraph.invoke({
      normalizedMessage: "Quiero reservar doble del 10/11/2026 al 12/11/2026 para 2",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });
    const step1Text = String(step1.messages?.[0]?.content);
    expect(step1Text).toMatch(/A nombre de quién|nombre y apellido|nombre completo/i);
    expect(step1Text).not.toMatch(/CONFIRMAR/i);

    const step2 = await agentGraph.invoke({
      normalizedMessage: "Carlos Ruiz",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });
    expect(String(step2.messages?.[0]?.content)).toMatch(/CONFIRMAR/i);
    expect(convStateStore.get(`${hotelId}:${conversationId}`)?.reservationSlots?.guestName).toBe("Carlos Ruiz");

    const step3 = await agentGraph.invoke({
      normalizedMessage: "CONFIRMAR",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });
    expect(String(step3.messages?.[0]?.content)).toMatch(/confirmada|creada/i);

    const searchCall = mcpCalls.find((c) => c?.name === "searchAvailability");
    expect(searchCall?.params?.startDate || searchCall?.params?.checkInDate).toBeTruthy();
    expect(searchCall?.params?.endDate || searchCall?.params?.checkOutDate).toBeTruthy();
  });

  it("T3: verify/snapshot transcript with persisted reservation", async () => {
    const conversationId = "golden-t3";
    convStateStore.set(`${hotelId}:${conversationId}`, {
      _id: `${hotelId}:${conversationId}`,
      hotelId,
      conversationId,
      reservationSlots: {
        guestName: "Lucia Perez",
        roomType: "suite",
        checkIn: "2026-09-01T00:00:00Z",
        checkOut: "2026-09-03T00:00:00Z",
        numGuests: "2",
        locale: "es",
      },
      lastReservation: {
        reservationId: "R-GOLDEN-123",
        status: "created",
        createdAt: new Date().toISOString(),
        channel: "web",
      },
      salesStage: "close",
      updatedAt: new Date().toISOString(),
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "¿Podés corroborar mi reserva?",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });

    expect(res.category).toBe("reservation_snapshot");
    const txt = String(res.messages?.[0]?.content || "");
    expect(txt.toLowerCase()).toContain("reserva confirmada");
    expect(txt).toContain("R-GOLDEN-123");
  });
});

// Path: /root/begasist/test/integration/reservations.mcp.channel-manager.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/astra/connection", async () => {
  const mod = await import("../mocks/astra");
  return { getAstraDB: () => ({ collection: (name: string) => mod.getCollection(name), table: (name: string) => mod.getTable(name) }) };
});

import { askAvailability, cancelReservation, confirmAndCreate, modifyReservation, quoteReservationModification } from "@/lib/agents/reservations";
import { POST as mcpPOST } from "@/app/api/mcp/route";

const TEST_MCP_KEY = "test-mcp-key";

function mkReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mcp-key": TEST_MCP_KEY },
    body: JSON.stringify(body),
  });
}

describe("reservation pipeline via MCP + ChannelManager adapter", () => {
  beforeEach(() => {
    vi.stubEnv("MCP_API_KEY", TEST_MCP_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs availability -> create -> update while HTTP Cancel remains contained", async () => {
    vi.stubEnv("MCP_ENDPOINT", "");
    vi.stubEnv("MCP_MOCK_PORT", "3000");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const pathname = new URL(url).pathname;
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;

      if (pathname === "/api/mcp") return mcpPOST(mkReq(url, body) as any);

      throw new Error(`Unhandled fetch in test: ${url}`);
    });

    const slots = {
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn: "2026-03-10",
      checkOut: "2026-03-12",
      numGuests: 2,
      locale: "es" as const,
    };

    const availability = await askAvailability("hotel999", slots as any);
    expect(availability.ok).toBe(true);
    expect(availability.available).toBe(true);
    expect(availability.options?.length).toBeGreaterThan(0);

    const created = await confirmAndCreate("hotel999", slots as any, "web");
    expect(created.ok).toBe(true);
    expect(created.reservationId).toBeTruthy();
    expect(created.reservation).toMatchObject({ hotelId: "hotel999", numGuests: 2 });

    const modifySlots = { ...slots, checkOut: "2026-03-13", numGuests: 1 } as any;
    const quote = await quoteReservationModification("hotel999", created.reservationId!, modifySlots);
    expect(quote).toMatchObject({ available: true, currency: "USD" });
    const updated = await modifyReservation(
      "hotel999",
      created.reservationId!,
      { ...modifySlots, quoteId: quote.quoteId, quoteVersion: quote.quoteVersion },
      "web"
    );
    expect(updated.ok).toBe(true);
    expect(updated.reservation).toMatchObject({
      reservationId: created.reservationId,
      checkOutDate: "2026-03-13T00:00:00.000Z",
      numGuests: 1,
      priceTotal: quote.priceTotal,
      currency: quote.currency,
    });

    const getBeforeCancel = await mcpPOST(
      mkReq("http://localhost/api/mcp", {
        action: "call",
        name: "getReservation",
        params: { hotelId: "hotel999", reservationId: created.reservationId },
      }) as any
    );
    const beforeJson = await getBeforeCancel.json();
    expect(beforeJson.ok).toBe(true);
    expect(beforeJson.data?.checkOutDate).toContain("2026-03-13");

    await expect(cancelReservation("hotel999", created.reservationId!)).rejects.toThrow(/403|disabled/i);

    const getAfterCancel = await mcpPOST(
      mkReq("http://localhost/api/mcp", {
        action: "call",
        name: "getReservation",
        params: { hotelId: "hotel999", reservationId: created.reservationId },
      }) as any
    );
    const afterJson = await getAfterCancel.json();
    expect(afterJson.ok).toBe(true);
    expect(afterJson.data?.status).toBe("confirmed");

    expect(fetchSpy).toHaveBeenCalled();
  });

  it("propagates quote requirements and preserves the complete durable reservation through MCP", async () => {
    const hotelId = `hotel-mcp-quote-${Date.now()}`;
    const createdResponse = await mcpPOST(mkReq("http://localhost/api/mcp", {
      action: "call", name: "createReservation", params: {
        hotelId, guestName: "MCP Quote", roomType: "double",
        checkInDate: "2026-05-10T00:00:00.000Z", checkOutDate: "2026-05-12T00:00:00.000Z",
      },
    }) as any);
    const created = await createdResponse.json();
    const reservationId = created.data.reservationId;
    expect(created.data.numGuests).toBeNull();

    const missingQuoteResponse = await mcpPOST(mkReq("http://localhost/api/mcp", {
      action: "call", name: "updateReservation", params: {
        hotelId, reservationId, checkOutDate: "2026-05-14T00:00:00.000Z",
      },
    }) as any);
    expect(await missingQuoteResponse.json()).toMatchObject({ ok: false, error: "QUOTE_REQUIRED" });

    const quoteResponse = await mcpPOST(mkReq("http://localhost/api/mcp", {
      action: "call", name: "quoteReservationModification", params: {
        hotelId, reservationId, checkOutDate: "2026-05-14T00:00:00.000Z",
      },
    }) as any);
    const quote = (await quoteResponse.json()).data;
    expect(quote).toMatchObject({ available: true, currency: "USD" });

    const updateResponse = await mcpPOST(mkReq("http://localhost/api/mcp", {
      action: "call", name: "updateReservation", params: {
        hotelId, reservationId, checkOutDate: "2026-05-14T00:00:00.000Z",
        quoteId: quote.quoteId, quoteVersion: quote.quoteVersion,
      },
    }) as any);
    expect(await updateResponse.json()).toMatchObject({
      ok: true,
      data: {
        reservationId,
        checkOutDate: "2026-05-14T00:00:00.000Z",
        numGuests: null,
        priceTotal: quote.priceTotal,
        currency: quote.currency,
      },
    });
  });
});

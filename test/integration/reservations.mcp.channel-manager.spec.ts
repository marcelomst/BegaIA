// Path: /root/begasist/test/integration/reservations.mcp.channel-manager.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { askAvailability, cancelReservation, confirmAndCreate, modifyReservation } from "@/lib/agents/reservations";
import { POST as mcpPOST } from "@/app/api/mcp/route";

function mkReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("reservation pipeline via MCP + ChannelManager adapter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs availability -> create -> update -> cancel using MCP routes and shared CM state", async () => {
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

    const updated = await modifyReservation(
      "hotel999",
      created.reservationId!,
      { ...slots, checkOut: "2026-03-13", numGuests: 3 } as any,
      "web"
    );
    expect(updated.ok).toBe(true);

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

    const cancelled = await cancelReservation("hotel999", created.reservationId!);
    expect(cancelled.ok).toBe(true);

    const getAfterCancel = await mcpPOST(
      mkReq("http://localhost/api/mcp", {
        action: "call",
        name: "getReservation",
        params: { hotelId: "hotel999", reservationId: created.reservationId },
      }) as any
    );
    const afterJson = await getAfterCancel.json();
    expect(afterJson.ok).toBe(true);
    expect(afterJson.data?.status).toBe("cancelled");

    expect(fetchSpy).toHaveBeenCalled();
  });
});

// Path: /root/begasist/test/api.demo.mcp.route.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as demoMcpPOST } from "@/app/api/demo/mcp/route";

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/demo/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/demo/mcp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 404 when NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO is not enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "0");

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await demoMcpPOST(makeReq({ name: "searchAvailability", params: { hotelId: "hotel-1" } }) as any);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when params.hotelId is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await demoMcpPOST(
      makeReq({ name: "searchAvailability", params: { startDate: "2026-10-10", endDate: "2026-10-11" } }) as any
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain("hotelId");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards to /api/mcp with x-mcp-key when MCP_API_KEY is present", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");
    vi.stubEnv("MCP_API_KEY", "secret-mcp-key");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { reservationId: "resv-123" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await demoMcpPOST(
      makeReq({
        name: "createReservation",
        params: {
          hotelId: "hotel-123",
          guestName: "QA User",
          roomType: "double",
          checkInDate: "2026-10-10",
          checkOutDate: "2026-10-12",
        },
      }) as any
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data?.reservationId).toBe("resv-123");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/mcp");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-mcp-key"]).toBe("secret-mcp-key");

    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      action: "call",
      name: "createReservation",
      params: {
        hotelId: "hotel-123",
      },
    });
  });
});

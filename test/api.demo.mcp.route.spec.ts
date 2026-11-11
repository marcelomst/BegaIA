// Path: /root/begasist/test/api.demo.mcp.route.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { POST as demoMcpPOST } from "@/app/api/demo/mcp/route";

async function listenOnLoopback(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  return (server.address() as AddressInfo).port;
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function makeReq(
  body: unknown,
  options: { url?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(options.url || "http://localhost/api/demo/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options.headers },
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

  it.each(["", "   "])("fails closed when MCP_API_KEY is absent or blank", async (apiKey) => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");
    vi.stubEnv("MCP_API_KEY", apiKey);
    vi.stubEnv("MCP_ENDPOINT", "http://trusted-mcp.internal:3000/api/mcp");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await demoMcpPOST(makeReq({
      name: "createReservation",
      params: { hotelId: "hotel-123" },
    }) as any);

    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", ""],
    ["invalid", "not-a-url"],
    ["unexpected path", "http://trusted-mcp.internal:3000/not-mcp"],
    ["embedded credentials", "http://user:password@trusted-mcp.internal:3000/api/mcp"],
  ])("fails closed when MCP_ENDPOINT is %s", async (_label, endpoint) => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");
    vi.stubEnv("MCP_API_KEY", "secret-mcp-key");
    vi.stubEnv("MCP_ENDPOINT", endpoint);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await demoMcpPOST(makeReq({
      name: "createReservation",
      params: { hotelId: "hotel-123" },
    }) as any);

    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses only the configured MCP endpoint even when caller origin headers are hostile", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");
    vi.stubEnv("MCP_API_KEY", "secret-mcp-key");
    vi.stubEnv("MCP_ENDPOINT", "http://trusted-mcp.internal:3000/api/mcp");

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
      }, {
        url: "https://attacker.example/api/demo/mcp",
        headers: {
          host: "attacker.example",
          forwarded: "host=attacker.example;proto=https",
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "https",
          "x-mcp-key": "caller-controlled-key",
        },
      }) as any
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.data?.reservationId).toBe("resv-123");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe("http://trusted-mcp.internal:3000/api/mcp");
    expect(url.toString()).not.toContain("attacker.example");
    expect(url.toString()).not.toContain("secret-mcp-key");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect((init.headers as Record<string, string>)["x-mcp-key"]).toBe("secret-mcp-key");

    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      action: "call",
      name: "createReservation",
      params: {
        hotelId: "hotel-123",
      },
    });
    expect(JSON.stringify(json)).not.toContain("secret-mcp-key");
  });

  it.each([301, 302, 303, 307, 308])(
    "does not follow HTTP %s or forward x-mcp-key to the redirect target",
    async (redirectStatus) => {
      const serviceKey = `redirect-test-key-${redirectStatus}`;
      let authorizedRequests = 0;
      let authorizedKey: string | undefined;
      let redirectedRequests = 0;
      let redirectedKey: string | undefined;

      const redirectTarget = createServer((req, res) => {
        redirectedRequests += 1;
        redirectedKey = req.headers["x-mcp-key"] as string | undefined;
        req.resume();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, data: { reservationId: "redirected" } }));
      });
      const redirectTargetPort = await listenOnLoopback(redirectTarget);

      const authorizedEndpoint = createServer((req, res) => {
        authorizedRequests += 1;
        authorizedKey = req.headers["x-mcp-key"] as string | undefined;
        req.resume();
        res.writeHead(redirectStatus, {
          Location: `http://127.0.0.1:${redirectTargetPort}/credential-capture`,
        });
        res.end();
      });
      const authorizedEndpointPort = await listenOnLoopback(authorizedEndpoint);

      try {
        vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");
        vi.stubEnv("MCP_API_KEY", serviceKey);
        vi.stubEnv("MCP_ENDPOINT", `http://127.0.0.1:${authorizedEndpointPort}/api/mcp`);

        const res = await demoMcpPOST(makeReq({
          name: "createReservation",
          params: { hotelId: "hotel-123" },
        }) as any);
        const responseBody = await res.text();

        expect(res.status).toBe(500);
        expect(authorizedRequests).toBe(1);
        expect(authorizedKey).toBe(serviceKey);
        expect(redirectedRequests).toBe(0);
        expect(redirectedKey).toBeUndefined();
        expect(responseBody).not.toContain(serviceKey);
        expect(responseBody).not.toContain("credential-capture");
      } finally {
        await Promise.all([
          closeServer(authorizedEndpoint),
          closeServer(redirectTarget),
        ]);
      }
    },
  );
});

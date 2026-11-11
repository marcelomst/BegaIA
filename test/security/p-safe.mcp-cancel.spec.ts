// Path: /home/marcelo/begasist/test/security/p-safe.mcp-cancel.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cancelWriter = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mcp/channelManagerAdapter", () => ({
  getCMProvider: () => "test-provider",
  getCMAdapter: () => ({
    cancelReservation: cancelWriter,
  }),
}));

import { POST as genericMcp } from "@/app/api/mcp/route";
import { POST as directCancel } from "@/app/api/mcp/reservations/cancel/route";
import { POST as demoMcp } from "@/app/api/demo/mcp/route";
import { middleware } from "@/middleware";
import { isCancellationProviderExecutionEnabled } from "@/lib/db/convState";

function request(url: string, body: unknown, apiKey?: string): any {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-mcp-key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

const cancelBody = {
  action: "call",
  name: "cancelReservation",
  params: { hotelId: "hotel-a", reservationId: "RES-1" },
};

describe("P-SAFE MCP Cancel containment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    cancelWriter.mockReset();
  });

  it("falla cerrado cuando MCP_API_KEY no está configurada", async () => {
    vi.stubEnv("MCP_API_KEY", "");
    const response = await genericMcp(request("http://localhost/api/mcp", cancelBody));
    const middlewareResponse = await middleware(request("http://localhost/api/mcp/reservations/create", {}));

    expect(response.status).toBe(503);
    expect(middlewareResponse.status).toBe(503);
    expect(cancelWriter).not.toHaveBeenCalled();
  });

  it("credencial ausente o inválida no alcanza el writer", async () => {
    vi.stubEnv("MCP_API_KEY", "valid-key");
    const absent = await genericMcp(request("http://localhost/api/mcp", cancelBody));
    const invalid = await genericMcp(request("http://localhost/api/mcp", cancelBody, "wrong-key"));

    expect(absent.status).toBe(401);
    expect(invalid.status).toBe(401);
    expect(cancelWriter).not.toHaveBeenCalled();
  });

  it("credencial válida sigue sin habilitar Cancel genérico", async () => {
    vi.stubEnv("MCP_API_KEY", "valid-key");
    const response = await genericMcp(request("http://localhost/api/mcp", cancelBody, "valid-key"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(cancelWriter).not.toHaveBeenCalled();
  });

  it("el endpoint directo bloquea Cancel con cualquier estado de credencial", async () => {
    vi.stubEnv("MCP_API_KEY", "valid-key");
    const absent = await directCancel();
    const invalid = await directCancel();
    const valid = await directCancel();

    expect([absent.status, invalid.status, valid.status]).toEqual([403, 403, 403]);
    expect(cancelWriter).not.toHaveBeenCalled();
  });

  it("el proxy demo tampoco ofrece un fallback hacia Cancel", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO", "1");
    vi.stubEnv("MCP_API_KEY", "valid-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await demoMcp(request("http://localhost/api/demo/mcp", {
      name: "cancelReservation",
      params: cancelBody.params,
    }));

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cancelWriter).not.toHaveBeenCalled();
  });

  it("mantiene el gate conversacional preventivo deshabilitado", () => {
    expect(isCancellationProviderExecutionEnabled()).toBe(false);
  });
});

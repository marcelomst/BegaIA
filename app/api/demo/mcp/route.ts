// Path: /root/begasist/app/api/demo/mcp/route.ts
import { NextRequest } from "next/server";

const REQUIRED_HEADER = "x-mcp-key";

function resolveTrustedMcpEndpoint(): URL | null {
  const configured = (process.env.MCP_ENDPOINT || "").trim();
  if (!configured) return null;

  try {
    const endpoint = new URL(configured);
    const path = endpoint.pathname.replace(/\/+$/, "");
    if (
      (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      path !== "/api/mcp"
    ) {
      return null;
    }
    return endpoint;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ENABLE_RESERVATIONS_DEMO !== "1") {
    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const name = String(body?.name ?? "").trim();
    const paramsRaw = body?.params;
    const params = paramsRaw && typeof paramsRaw === "object" ? (paramsRaw as Record<string, unknown>) : null;

    if (!name) {
      return Response.json({ ok: false, error: "Missing tool name" }, { status: 400 });
    }
    if (!params) {
      return Response.json({ ok: false, error: "Invalid params" }, { status: 400 });
    }
    if (name === "cancelReservation") {
      return Response.json({ ok: false, error: "Cancellation is temporarily disabled" }, { status: 403 });
    }

    const hotelId = String(params.hotelId ?? "").trim();
    if (!hotelId) {
      return Response.json({ ok: false, error: "Missing hotelId" }, { status: 400 });
    }

    const mcpApiKey = (process.env.MCP_API_KEY || "").trim();
    if (!mcpApiKey) {
      return Response.json({ ok: false, error: "MCP authentication is not configured" }, { status: 503 });
    }
    const mcpEndpoint = resolveTrustedMcpEndpoint();
    if (!mcpEndpoint) {
      return Response.json({ ok: false, error: "MCP endpoint is not configured" }, { status: 503 });
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [REQUIRED_HEADER]: mcpApiKey,
    };

    const mcpResponse = await fetch(mcpEndpoint, {
      method: "POST",
      headers,
      redirect: "error",
      body: JSON.stringify({
        action: "call",
        name,
        params: { ...params, hotelId },
      }),
      cache: "no-store",
    });

    const mcpPayload = await mcpResponse.json().catch(() => ({} as Record<string, unknown>));
    if (!mcpResponse.ok || mcpPayload?.ok === false) {
      const error =
        typeof mcpPayload?.error === "string" && mcpPayload.error
          ? mcpPayload.error
          : "MCP proxy call failed";
      return Response.json({ ok: false, error }, { status: mcpResponse.status || 500 });
    }

    return Response.json({ ok: true, data: (mcpPayload as { data?: unknown }).data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

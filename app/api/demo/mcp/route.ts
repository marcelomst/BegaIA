// Path: /root/begasist/app/api/demo/mcp/route.ts
import { NextRequest } from "next/server";

const REQUIRED_HEADER = "x-mcp-key";

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

    const hotelId = String(params.hotelId ?? "").trim();
    if (!hotelId) {
      return Response.json({ ok: false, error: "Missing hotelId" }, { status: 400 });
    }

    const mcpApiKey = process.env.MCP_API_KEY || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (mcpApiKey) {
      headers[REQUIRED_HEADER] = mcpApiKey;
    }

    const mcpResponse = await fetch(`${req.nextUrl.origin}/api/mcp`, {
      method: "POST",
      headers,
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

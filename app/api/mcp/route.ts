// Path: /root/begasist/app/api/mcp/route.ts
import { NextRequest } from "next/server";
import { getReservationsCapabilities, handleMcpCall } from "@/lib/mcp/reservationsService";

const REQUIRED_HEADER = "x-mcp-key";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.MCP_API_KEY || "";
    if (apiKey) {
      const provided = req.headers.get(REQUIRED_HEADER) || "";
      if (provided !== apiKey) {
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized MCP call" }), { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({} as any));
    const { action, name, params } = body ?? {};

    // action=describe -> devuelve capacidades MCP
    if (action === "describe") {
      return Response.json({ ok: true, capabilities: getReservationsCapabilities() });
    }

    // action=call -> ejecuta función concreta
    if (action === "call") {
      if (!name) {
        return Response.json({ ok: false, error: "Missing 'name' for call" }, { status: 400 });
      }
      const result = await handleMcpCall(name, params);
      return Response.json({ ok: true, data: result });
    }

    return Response.json({ ok: false, error: "Unsupported action. Use 'describe' or 'call'." }, { status: 400 });
  } catch (err: any) {
    console.error("[MCP] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "Internal error" }), { status: 500 });
  }
}

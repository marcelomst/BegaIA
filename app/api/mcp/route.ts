// Path: /root/begasist/app/api/mcp/route.ts
import { NextRequest } from "next/server";
import { getReservationsCapabilities, handleMcpCall } from "@/lib/mcp/reservationsService";
import { getCMProvider } from "@/lib/mcp/channelManagerAdapter";

const REQUIRED_HEADER = "x-mcp-key";

export async function POST(req: NextRequest) {
  const start = Date.now();
  let action = "";
  let name = "";
  let hotelId = "";
  let reservationId = "";
  const provider = getCMProvider();

  const logOutcome = (ok: boolean, reservationIdOverride?: string) => {
    const payload = {
      ts: new Date().toISOString(),
      hotelId: hotelId || undefined,
      action: action || undefined,
      name: name || undefined,
      provider,
      ok,
      durationMs: Date.now() - start,
      reservationId: reservationIdOverride || reservationId || undefined,
    };
    (ok ? console.log : console.error)(JSON.stringify(payload));
  };

  try {
    const apiKey = process.env.MCP_API_KEY || "";
    if (apiKey) {
      const provided = req.headers.get(REQUIRED_HEADER) || "";
      if (provided !== apiKey) {
        logOutcome(false);
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized MCP call" }), { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({} as any));
    action = String(body?.action ?? "");
    name = String(body?.name ?? "");
    const params = body?.params ?? {};
    hotelId = String(params?.hotelId ?? "").trim();
    reservationId = String(params?.reservationId ?? "").trim();

    // action=describe -> devuelve capacidades MCP
    if (action === "describe") {
      logOutcome(true);
      return Response.json({ ok: true, capabilities: getReservationsCapabilities() });
    }

    // action=call -> ejecuta función concreta
    if (action === "call") {
      if (!name) {
        logOutcome(false);
        return Response.json({ ok: false, error: "Missing 'name' for call" }, { status: 400 });
      }
      if (!hotelId) {
        logOutcome(false);
        return Response.json({ ok: false, error: "Missing hotelId" }, { status: 400 });
      }
      const result = await handleMcpCall(name, params);
      const reservationIdFromResult =
        typeof result === "object" && result
          ? String((result as any)?.reservationId ?? (result as any)?.reservation?.reservationId ?? "").trim()
          : "";
      logOutcome(true, reservationIdFromResult || undefined);
      return Response.json({ ok: true, data: result });
    }

    logOutcome(false);
    return Response.json({ ok: false, error: "Unsupported action. Use 'describe' or 'call'." }, { status: 400 });
  } catch (err: any) {
    logOutcome(false);
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? "Internal error" }), { status: 500 });
  }
}

import { NextRequest } from "next/server";
// Path: /root/begasist/app/api/mcp/reservations/cancel/route.ts
import { getCMAdapter } from "@/lib/mcp/channelManagerAdapter";

// POST /api/mcp/reservations/cancel
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hotelId = String(body?.hotelId ?? "").trim();
    const reservationId = String(body?.reservationId ?? "").trim();
    const reason = typeof body?.reason === "string" ? body.reason : undefined;

    if (!hotelId || !reservationId) {
      return Response.json({ ok: false, error: "Missing hotelId or reservationId" }, { status: 400 });
    }

    const cm = getCMAdapter(hotelId);
    await cm.cancelReservation({ hotelId, reservationId, reason });
    return Response.json({ ok: true, status: "cancelled" });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

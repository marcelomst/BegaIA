// Path: /root/begasist/app/api/email/polling/route.ts
import { NextRequest, NextResponse } from "next/server";
import { enableEmailPolling, disableEmailPolling } from "@/lib/services/emailPollControl";
import { setEmailPollingState, getEmailPollingState } from "@/lib/services/emailPollingState";

let pollingCallCount = 0;

// Activar/desactivar el bot de email
export async function POST(req: NextRequest) {
  try {
    const { enabled, hotelId } = await req.json();

    if (typeof enabled !== "boolean" || typeof hotelId !== "string") {
      console.warn("❌ [email] Petición inválida en /api/email/polling:", { enabled, hotelId });
      return NextResponse.json({ error: "Missing or invalid 'enabled' or 'hotelId'" }, { status: 400 });
    }

    pollingCallCount += 1;
    console.log(`🔄 [email] (#${pollingCallCount}) Cambiando estado de polling de email para ${hotelId}: ${enabled}`);

    try {
      await setEmailPollingState(hotelId, enabled);
    } catch (err) {
      console.warn("⚠️ No se pudo guardar el estado de polling en base persistente:", err);
    }

    if (enabled) enableEmailPolling(hotelId);
    else disableEmailPolling(hotelId);

    return NextResponse.json({ success: true, enabled });
  } catch (err) {
    console.error("🛑 Error en /api/email/polling [POST]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Consultar el estado actual del polling
export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  if (!hotelId) {
    return NextResponse.json({ error: "Missing hotelId" }, { status: 400 });
  }

  try {
    const enabled = await getEmailPollingState(hotelId);
    return NextResponse.json({ hotelId, enabled });
  } catch (err) {
    console.error("🛑 Error en /api/email/polling [GET]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

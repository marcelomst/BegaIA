// Path: /root/begasist/app/api/whatsapp/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppState, getQR } from "@/lib/services/redis";

export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  if (!hotelId) return NextResponse.json({ error: "hotelId requerido" }, { status: 400 });

  // Estado de conexión guardado por el bot: "connected", "waiting_qr", "disconnected", etc.
  const state = await getWhatsAppState(hotelId);

  // Si está esperando QR, devolvé el QR también
  let qr: string | null = null;
  if (state === "waiting_qr") {
    qr = await getQR(hotelId);
  }
  return NextResponse.json({ state, qr });
}

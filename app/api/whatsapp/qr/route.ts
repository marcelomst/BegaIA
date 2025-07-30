// Path: /root/begasist/app/api/whatsapp/qr/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getQR } from "@/lib/services/redis";

export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  if (!hotelId) return NextResponse.json({ error: "hotelId requerido" }, { status: 400 });
  const qr = await getQR(hotelId);
  if (!qr) return NextResponse.json({ error: "No hay QR disponible" }, { status: 404 });
  return NextResponse.json({ qr });
}

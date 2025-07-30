// /app/api/hotels/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId } = await req.json();
  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });
  }
  if (hotelId === "system") {
    return NextResponse.json({ error: "No se puede eliminar el hotel system" }, { status: 400 });
  }
  await deleteHotelConfig(hotelId);
  return NextResponse.json({ ok: true });
}

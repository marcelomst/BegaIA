// /app/api/hotels/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotelId");

  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ hotel: config });
}

// /app/api/users/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId } = await req.json();

  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }

  return NextResponse.json({ users: config.users });
}

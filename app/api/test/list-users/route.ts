// /app/api/test/list-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId } = await req.json();
  if (!hotelId) return NextResponse.json({ error: "hotelId faltante" }, { status: 400 });

  const config = await getHotelConfig(hotelId);
  if (!config?.users) return NextResponse.json({ error: "Hotel o usuarios no encontrados" }, { status: 404 });

  return NextResponse.json({ users: config.users });
}

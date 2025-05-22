// /app/api/users/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { HotelUser } from "@/types/user";

export async function POST(req: NextRequest) {
  const { hotelId, user }: { hotelId: string; user: HotelUser } = await req.json();

  if (!hotelId || !user || !user.userId) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  const updatedUsers = (config.users || []).map((u) =>
    u.userId === user.userId ? { ...u, ...user } : u
  );

  await updateHotelConfig(hotelId, { users: updatedUsers });

  return NextResponse.json({ success: true });
}

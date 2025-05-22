// /root/begasist/app/admin/users/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId, userId } = await req.json();

  if (!hotelId || !userId) {
    return NextResponse.json({ error: "Faltan hotelId o userId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  const user = config.users?.find((u) => u.userId === userId);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

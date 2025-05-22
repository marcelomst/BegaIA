// /app/api/users/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId, userId } = await req.json();

  if (!hotelId || !userId) {
    return NextResponse.json({ error: "Faltan hotelId o userId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

const users = config.users ?? [];
const remainingUsers = users.filter((u) => u.userId !== userId);

if (remainingUsers.length === users.length) {
  return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
}


  await updateHotelConfig(hotelId, { users: remainingUsers });

  return NextResponse.json({ success: true });
}

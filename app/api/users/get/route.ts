// /app/api/users/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId, userId } = await req.json();

  if (!hotelId || !userId) {
    return NextResponse.json({ error: "Faltan hotelId o userId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }

  console.log(`🔍 Buscando usuario ${userId} en hotel ${hotelId}`);

  const user = config.users.find((u) => u.userId === userId);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // ✅ Solo campos seguros
  const safeUser = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    position: user.position,
    roleLevel: user.roleLevel,
    active: user.active,
    createdAt: user.createdAt,
    verificationToken: !!user.verificationToken,
  };

  return NextResponse.json({ user: safeUser });
}

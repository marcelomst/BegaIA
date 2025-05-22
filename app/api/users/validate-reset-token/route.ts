// /app/api/users/validate-reset-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token faltante" }, { status: 400 });
  }

  const configs = await getAllHotelConfigs();

  for (const config of configs) {
    const user = config.users?.find((u) => u.resetToken === token);
    if (!user) continue;

    if (!user.resetTokenExpires) {
      return NextResponse.json({ error: "Token inválido o corrupto" }, { status: 400 });
    }

    const isExpired = new Date(user.resetTokenExpires) < new Date();
    if (isExpired) {
      return NextResponse.json({ error: "Token expirado" }, { status: 400 });
    }

    // Token válido y vigente
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Token inválido" }, { status: 404 });
}

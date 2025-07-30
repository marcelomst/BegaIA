// Path: /app/api/users/check-verification-token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ ok: false, error: "Token faltante" });

  const configs = await getAllHotelConfigs();
  for (const config of configs) {
    const user = config.users?.find((u) => u.verificationToken === token);
    if (user) {
      return NextResponse.json({
        ok: true,
        hasPassword: !!user.passwordHash,
      });
    }
  }
  return NextResponse.json({ ok: false, error: "Token inválido" });
}

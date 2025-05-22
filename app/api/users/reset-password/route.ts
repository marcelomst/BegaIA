// /app/api/users/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { updateHotelConfig, getAllHotelConfigs } from "@/lib/config/hotelConfig.server";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword?.trim()) {
    return NextResponse.json({ error: "Faltan token o nueva contraseña válida" }, { status: 400 });
  }

  const configs = await getAllHotelConfigs();

  for (const config of configs) {
    const user = config.users?.find((u) => u.resetToken === token);
    if (!user) continue;

    if (!user.resetTokenExpires) {
      return NextResponse.json({ error: "Token inválido o corrupto" }, { status: 400 });
    }

    if (new Date(user.resetTokenExpires) < new Date()) {
      return NextResponse.json({ error: "Token expirado" }, { status: 400 });
    }

    // Actualización segura
    user.passwordHash = await hash(newPassword, 10);
    user.active = true;
    delete user.resetToken;
    delete user.resetTokenExpires;

    await updateHotelConfig(config.hotelId, { users: config.users });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Token inválido" }, { status: 404 });
}

// Path: /root/begasist/app/api/users/verify-account-set-password/route.ts

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
    const user = config.users?.find((u) => u.verificationToken === token);
    if (!user) continue;

    // Permití usar el token solo una vez
    user.passwordHash = await hash(newPassword, 10);
    user.active = true;
    delete user.verificationToken;

    await updateHotelConfig(config.hotelId, { users: config.users });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Token inválido" }, { status: 404 });
}

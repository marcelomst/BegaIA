import { NextRequest, NextResponse } from "next/server";
import { updateHotelConfig, getAllHotelConfigs } from "@/lib/config/hotelConfig.server";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (!token || !newPassword?.trim()) {
    return NextResponse.json({ error: "Faltan token o nueva contraseña válida" }, { status: 400 });
  }

  const configs = await getAllHotelConfigs();

  // Debug: contar usuarios encontrados con ese token
  let tokenFound = false;

  for (const config of configs) {
    if (!Array.isArray(config.users)) continue; // 💡 SAFE: solo procesar si users es array

    const user = config.users.find((u) => u.resetToken === token);
    if (!user) continue;

    tokenFound = true;
    console.log(`[RESET PASSWORD] User: ${user.email}, Hotel: ${config.hotelId}`);

    if (!user.resetTokenExpires) {
      console.warn(`[RESET PASSWORD] Token corrupto para: ${user.email} (${config.hotelId})`);
      return NextResponse.json({ error: "Token inválido o corrupto" }, { status: 400 });
    }

    if (new Date(user.resetTokenExpires) < new Date()) {
      console.warn(`[RESET PASSWORD] Token expirado para: ${user.email} (${config.hotelId})`);
      return NextResponse.json({ error: "Token expirado" }, { status: 400 });
    }

    // Actualización segura
    user.passwordHash = await hash(newPassword, 10);
    user.active = true;
    delete user.resetToken;
    delete user.resetTokenExpires;

    // Debug antes de guardar
    console.log(`[RESET PASSWORD] Guardando nuevo passwordHash para ${user.email} (${config.hotelId})`);
    console.log("[RESET PASSWORD] Antes de updateHotelConfig: ", {
      hotelId: config.hotelId,
      users: config.users.map(u => ({
        email: u.email,
        userId: u.userId,
        active: u.active,
        passwordHash: u.passwordHash?.slice(0, 16), // solo muestra los primeros 16 chars
      })),
    });

    await updateHotelConfig(config.hotelId, { users: config.users });

    return NextResponse.json({ ok: true });
  }

  if (!tokenFound) {
    console.warn(`[RESET PASSWORD] Token no encontrado en ningún hotel`);
  }

  return NextResponse.json({ error: "Token inválido" }, { status: 404 });
}

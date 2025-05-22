// /app/api/users/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { hash, compare } from "bcryptjs";

export async function POST(req: NextRequest) {
  const { hotelId, email, currentPassword, newPassword } = await req.json();

  if (!hotelId || !email || !currentPassword || !newPassword) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }

  const user = config.users.find((u) => u.email === email);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Validar existencia de hash
  if (!user.passwordHash) {
    return NextResponse.json({ error: "Usuario sin contraseña definida" }, { status: 400 });
  }

  const validPassword = await compare(currentPassword, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 403 });
  }

  const newHash = await hash(newPassword, 10);
  user.passwordHash = newHash;

  delete user.resetToken;
  delete user.resetTokenExpires;

  await updateHotelConfig(hotelId, { users: config.users });

  return NextResponse.json({ ok: true });
}

// /app/api/me/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { compare, hash } from "bcryptjs";
import { verifyJWT } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Token faltante" }, { status: 401 });
  }
  
  const payload = await verifyJWT(token);
  

  if (!payload) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
  }

  const { email, hotelId } = payload;
  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Configuración del hotel inválida" }, { status: 500 });
  }

  const user = config.users.find((u) => u.email === email);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Usuario no encontrado o sin contraseña" }, { status: 404 });
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });
  }

  user.passwordHash = await hash(newPassword, 10);
  await updateHotelConfig(hotelId, { users: config.users });

  return NextResponse.json({ ok: true, message: "Contraseña actualizada correctamente" });
}

// /app/api/users/send-recovery-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { generateToken } from "@/lib/auth/tokenUtils";
import { sendRecoveryEmail } from "@/lib/email/sendRecoveryEmail";

export async function POST(req: NextRequest) {
  const { hotelId, email } = await req.json();

  if (!hotelId || !email) {
    return NextResponse.json({ error: "Faltan hotelId o email" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config?.users || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }

  const user = config.users.find((u) => u.email === email);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Generar nuevo token seguro
  const recoveryToken = generateToken();
  user.resetToken = recoveryToken;
  user.resetTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(); // 2 horas

  await updateHotelConfig(hotelId, { users: config.users });

  // Enviar email reutilizando helper
  await sendRecoveryEmail({
    email: user.email,
    token: recoveryToken,
    hotelId,
  });

  return NextResponse.json({ ok: true });
}

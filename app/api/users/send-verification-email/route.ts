// /app/api/send-verification-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildVerificationUrl } from "@/lib/utils/buildVerificationUrl";
import type { EmailConfig } from "@/types/channel";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hotelId, email } = body;

  if (!hotelId || !email) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Configuración del hotel no encontrada" }, { status: 404 });
  }

  // Nuevo: tomamos el emailConfig desde channelConfigs
  const emailConfig = config.channelConfigs?.email as EmailConfig | undefined;
  if (
    !emailConfig ||
    !emailConfig.smtpHost ||
    !emailConfig.smtpPort ||
    !emailConfig.dirEmail ||
    !emailConfig.password
  ) {
    return NextResponse.json({ error: "Configuración SMTP de canal email incompleta" }, { status: 500 });
  }

  const user = config.users.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const token = randomUUID();
  user.verificationToken = token;
  user.active = false;

  await updateHotelConfig(hotelId, { users: config.users });

  const verifyUrl = await buildVerificationUrl("verify-account", token, hotelId);

  await sendEmail(
    {
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      user: emailConfig.dirEmail,      // ahora "dirEmail" es el correo usado para enviar
      pass: emailConfig.password,
      secure: emailConfig.secure ?? false,
    },
    email,
    "Verificación de cuenta",
    `
      <p>Hola,</p>
      <p>Para activar tu cuenta, hacé clic en el siguiente enlace:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>Si no solicitaste esto, ignorá este mensaje.</p>
    `
  );

  return NextResponse.json({ ok: true });
}

// /lib/auth/sendVerificationEmail.ts

import { buildVerificationUrl } from "@/lib/utils/buildVerificationUrl";
import nodemailer from "nodemailer";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { EmailConfig } from "@/types/channel"; // 👈 Usa EmailConfig

export async function sendVerificationEmail({
  email,
  verificationToken,
  hotelId,
  emailSettings,
}: {
  email: string;
  verificationToken: string;
  hotelId: string;
  emailSettings: EmailConfig;  // 👈 Tipo correcto
}) {
  // 1. Construir URL de verificación (usando el helper ya existente)
  const verificationUrl = await buildVerificationUrl("verify-account", verificationToken, hotelId);

  if (!emailSettings) {
    throw new Error(`No hay configuración de email para el hotel ${hotelId}`);
  }

  // 3. Configurar nodemailer con los datos del hotel
  const transporter = nodemailer.createTransport({
    host: emailSettings.smtpHost,
    port: emailSettings.smtpPort,
    secure: !!emailSettings.secure,
    auth: {
      user: emailSettings.dirEmail,    // 👈 Usa dirEmail, no emailAddress
      pass: emailSettings.password,
    },
  });

  // 4. Enviar el email
  await transporter.sendMail({
    from: emailSettings.dirEmail, // 👈 Usa dirEmail
    to: email,
    subject: "Activa tu cuenta de administrador",
    text: `Bienvenido/a, activa tu cuenta usando el siguiente enlace: ${verificationUrl}`,
    html: `<p>Bienvenido/a,<br>Para activar tu cuenta de administrador, haz clic aquí:</p>
           <p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
  });
}

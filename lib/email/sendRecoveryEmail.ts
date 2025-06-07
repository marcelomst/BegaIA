// /lib/email/sendRecoveryEmail.ts

import { buildVerificationUrl } from "@/lib/utils/buildVerificationUrl";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { sendEmail } from "@/lib/email/sendEmail";

/**
 * Envía email de recuperación de contraseña.
 */
export async function sendRecoveryEmail(options: { email: string; token: string; hotelId: string }) {
  const { email, token, hotelId } = options;

  const recoveryUrl = await buildVerificationUrl("reset-password", token, hotelId);

  const config = await getHotelConfig(hotelId);
  const emailConfig = config?.channelConfigs.email;

  if (!emailConfig) {
    throw new Error(`Configuración de email no encontrada para hotel ${hotelId}`);
  }

  const subject = `🔑 Recuperación de contraseña - ${config.hotelName || "Hotel Assistant"}`;
  const html = `
    <p>Hola,</p>
    <p>Has solicitado restablecer tu contraseña.</p>
    <p>Haz clic en el siguiente enlace para continuar:</p>
    <p><a href="${recoveryUrl}" target="_blank">${recoveryUrl}</a></p>
    <p>Este enlace expirará en 2 horas.</p>
    <p>Si no solicitaste esta acción, puedes ignorar este mensaje.</p>
    <br>
    <p>— El equipo de soporte</p>
  `;

  await sendEmail(
    {
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      user: emailConfig.dirEmail,
      pass: emailConfig.password,
      secure: emailConfig.secure ?? false,
    },
    email,
    subject,
    html
  );
}

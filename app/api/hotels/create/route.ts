// Path: /root/begasist/app/api/hotels/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveEmailCredentials, EMAIL_SENDING_ENABLED } from "@/lib/email/resolveEmailCredentials";
import { buildVerificationUrl } from "@/lib/utils/buildVerificationUrl";

const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";
const DEFAULT_LANGUAGE = "es";

export async function POST(req: NextRequest) {
  try {
    const {
      hotelId,
      hotelName,
      country,
      timezone,
      defaultLanguage,
      adminEmail,
      adminRoleLevel,
      whatsappNumber,
      emailChannelConfig,
      // ...opcionales...
    } = await req.json();

    // Validaciones mínimas
    if (!hotelName || !adminEmail || !whatsappNumber || !emailChannelConfig?.dirEmail) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
    }

    const generatedHotelId = hotelId && hotelId.length > 0 ? hotelId : randomUUID();
    const verificationToken = randomUUID();

    // --- 1. Crear usuario admin (INACTIVO, con verificationToken, SIN passwordHash) ---
    const users = [
      {
        userId: randomUUID(),
        email: adminEmail,
        // passwordHash: undefined, // <--- no setear hasta verificación
        roleLevel: adminRoleLevel ?? 10,
        active: false,
        createdAt: new Date().toISOString(),
        name: "Admin",
        position: "Administrador",
        verificationToken,
      },
    ];

    // --- 2. ChannelConfigs igual que antes ---
    const channelConfigs: any = {
      whatsapp: {
        enabled: true,
        mode: "automatic" as "automatic",
        celNumber: whatsappNumber,
      },
      email: {
        ...emailChannelConfig,
        enabled: true,
        mode: "supervised" as "supervised",
      },
      web: { enabled: true, mode: "automatic" as "automatic" },
    };

    const newHotel = {
      hotelId: generatedHotelId,
      hotelName,
      country,
      timezone: timezone || DEFAULT_TIMEZONE,
      defaultLanguage: defaultLanguage || DEFAULT_LANGUAGE,
      channelConfigs,
      users,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    // --- 3. Guardar el hotel ---
    const existing = await getHotelConfig(generatedHotelId);
    if (existing) {
      return NextResponse.json({ error: "Ya existe un hotel con ese ID" }, { status: 409 });
    }
    await updateHotelConfig(generatedHotelId, newHotel);

    // --- 4. Usar el helper actual de verificación ---
    const emailConfig = channelConfigs.email;
    const verifyUrl = await buildVerificationUrl("verify-account", verificationToken, generatedHotelId);

    const creds = resolveEmailCredentials(emailConfig);
    if (EMAIL_SENDING_ENABLED && creds && creds.pass && creds.source !== "none") {
      await sendEmail({
        host: creds.host,
        port: creds.port,
        user: creds.user,
        pass: creds.pass,
        secure: creds.secure ?? false,
      }, adminEmail, "Verificación de cuenta de administrador", `
        <p>Hola,</p>
        <p>Te asignaron como administrador del hotel <b>${hotelName}</b>.</p>
        <p>Para activar tu cuenta y elegir una contraseña, hacé clic en el siguiente enlace:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Si no solicitaste esto, ignorá este mensaje.</p>
      `);
    }

    return NextResponse.json({ ok: true, hotelId: generatedHotelId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error inesperado" }, { status: 400 });
  }
}

// /lib/services/hotel.ts

import { getHotelConfigCollection} from "@/lib/config/hotelConfig.server";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/auth/sendVerificationEmail";
import type { EmailConfig } from "@/types/channel";

/**
 * Crea un nuevo hotel y usuario administrador inicial, enviando email de verificación.
 * Devuelve: { ok: true, hotelId }
 */
export async function createHotelWithAdmin({
  hotelId,
  hotelName,
  timezone,
  defaultLanguage = "spa",
  adminEmail,
  adminPassword,
  adminRoleLevel = 10,
  emailChannelConfig, // <-- EmailConfig completo
}: {
  hotelId: string;
  hotelName: string;
  timezone: string;
  defaultLanguage?: string;
  adminEmail: string;
  adminPassword: string;
  adminRoleLevel?: number;
  emailChannelConfig: EmailConfig; // <-- tipo correcto
}) {
  if (!hotelId || !hotelName || !timezone || !adminEmail || !adminPassword || !emailChannelConfig) {
    throw new Error("Faltan datos obligatorios");
  }

  // Chequeo de duplicados
  const collection = getHotelConfigCollection();
  const existing = await collection.findOne({ hotelId });
  if (existing) throw new Error("Ya existe un hotel con ese ID");

  // Restricción: solo el hotel system puede tener SuperAdmin (roleLevel 0)
  if (hotelId !== "system" && adminRoleLevel === 0) {
    throw new Error("No se puede asignar roleLevel 0 fuera del hotel system");
  }

  // Hasheo de contraseña
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // 🚩 Token de verificación
  const verificationToken = randomUUID();

  // Configuración mínima del hotel
  const hotelConfig = {
    hotelId,
    hotelName,
    timezone,
    defaultLanguage,
    channelConfigs: {
      email: emailChannelConfig, // <-- Ahora en channelConfigs
    },
    users: [
      {
        userId: randomUUID(),
        email: adminEmail,
        passwordHash,
        roleLevel: adminRoleLevel,
        active: false,
        verificationToken,
        createdAt: new Date().toISOString(),
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
  
  await collection.insertOne(hotelConfig);

  // 🚀 Envía el email de verificación usando la config recién cargada
  try {
    await sendVerificationEmail({
      email: adminEmail,
      verificationToken,
      hotelId,
      emailSettings: emailChannelConfig, // <-- tipo EmailConfig
    });
  } catch (err) {
    console.error("Error enviando email de verificación al admin:", err);
    throw new Error("Error enviando email de verificación al admin.");
  }

  return { ok: true, hotelId, verificationEmailSent: true };
}

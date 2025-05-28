// /lib/services/hotel.ts

import { collection } from "@/lib/config/hotelConfig.server";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/auth/sendVerificationEmail"; // 👈 Import

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
  emailSettings, // 👈 Agregá este campo
}: {
  hotelId: string;
  hotelName: string;
  timezone: string;
  defaultLanguage?: string;
  adminEmail: string;
  adminPassword: string;
  adminRoleLevel?: number;
  emailSettings: { // ⬅️ asegurate de tipar igual que tu definición
    emailAddress: string;
    password: string;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    secure?: boolean;
    checkInterval?: number;
  };
}) {
  if (!hotelId || !hotelName || !timezone || !adminEmail || !adminPassword || !emailSettings) {
    throw new Error("Faltan datos obligatorios");
  }

  // Chequeo de duplicados
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
    channelConfigs: {},
    emailSettings, // 👈 Guardá directamente la config de mail que recibiste
    users: [
      {
        userId: randomUUID(),
        email: adminEmail,
        passwordHash,
        roleLevel: adminRoleLevel,
        active: false, // ⚠️ Inactivo hasta verificar email
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
      emailSettings, // <-- No hay que buscarla, la recibís y reenviás
    });

  } catch (err) {
    console.error("Error enviando email de verificación al admin:", err);
    throw new Error("Error enviando email de verificación al admin.");
  }

  return { ok: true, hotelId, verificationEmailSent: true };

}

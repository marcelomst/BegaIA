// /lib/services/hotel.ts

import { collection } from "@/lib/config/hotelConfig.server";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/auth/sendVerificationEmail"; // 👈 Nuevo import

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
  adminRoleLevel = 10, // Por defecto gerente
}: {
  hotelId: string;
  hotelName: string;
  timezone: string;
  defaultLanguage?: string;
  adminEmail: string;
  adminPassword: string;
  adminRoleLevel?: number;
}) {
  if (!hotelId || !hotelName || !timezone || !adminEmail || !adminPassword) {
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
    users: [
      {
        userId: randomUUID(),
        email: adminEmail,
        passwordHash,
        roleLevel: adminRoleLevel,
        active: false, // ⚠️ Inactivo hasta verificar email
        verificationToken, // 👈
        createdAt: new Date().toISOString(),
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  await collection.insertOne(hotelConfig);

  // 🚀 Envía el email de verificación
  try {
    await sendVerificationEmail({
      email: adminEmail,
      verificationToken,
      hotelId,
    });
  } catch (err) {
    console.error("Error enviando email de verificación al admin:", err);
    // Podrías eliminar el hotel recién creado si querés 100% atomicidad.
    // O simplemente retornar ok: false, pero queda a tu criterio.
    throw new Error("Error enviando email de verificación al admin.");
  }

  return { ok: true, hotelId };
}

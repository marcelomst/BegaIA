// /root/begasist/scripts/init-new-hotel.ts
// Script para inicializar un hotel y su usuario admin técnico.
// Uso: pnpm tsx scripts/init-new-hotel.ts <hotelId> <hotelName> <adminEmail> <password> [roleLevel]

import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { updateHotelConfig } from "../lib/config/hotelConfig.server";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  const hotelId = process.argv[2];
  const hotelName = process.argv[3];
  const adminEmail = process.argv[4];
  const plainPassword = process.argv[5];
  const roleLevelArg = process.argv[6];

  if (!hotelId || !hotelName || !adminEmail || !plainPassword) {
    console.error("❌ Uso: pnpm tsx scripts/init-new-hotel.ts <hotelId> <hotelName> <adminEmail> <password> [roleLevel]");
    process.exit(1);
  }

  const passwordHash = await hash(plainPassword, 10);
  const verificationToken = randomUUID();
  const roleLevel = roleLevelArg ? parseInt(roleLevelArg) : 10; // por defecto 10 (admin hotel)

  const adminUser = {
    userId: randomUUID(),
    email: adminEmail,
    passwordHash,
    roleLevel,
    active: false,
    verificationToken,
    createdAt: new Date().toISOString(),
    // Otros campos opcionales según tu HotelUser...
  };

  const hotelConfig = {
    hotelId,
    hotelName,
    defaultLanguage: "es",
    timezone: "America/Argentina/Buenos_Aires",
    channelConfigs: {
      web: { enabled: true, mode: "supervised" },
      // Podés agregar más canales por defecto si lo necesitás.
      email: {
        enabled: true,
        mode: "supervised",
        dirEmail: "begamshop.ventas@gmail.com",
        password: "umammswkuzoakqqu", // ⚠️ Coloca el valor real solo para pruebas, nunca en producción
        imapHost: "imap.gmail.com",
        imapPort: 993,
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        secure: false,
        checkInterval: 10,
      },
    },
    users: [adminUser],
    verification: {
      baseUrl: "https://asistente.hotel.com/verify-account",
    },
    retrievalSettings: {
      useAstra: true,
      fallbackUrl: "https://hotel.com/ai-fallback",
    },
    lastUpdated: new Date().toISOString(),
  };

  await updateHotelConfig(hotelId, hotelConfig);
  console.log("✅ Hotel creado:", hotelId);
  console.log("👤 Usuario técnico/admin creado:", adminEmail);
  console.log("📧 Token de verificación:", verificationToken);
}

run();

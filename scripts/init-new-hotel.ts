// scripts/init-new-hotel.ts
// Este script inicializa un nuevo hotel en la base de datos y crea un usuario técnico/admin.
// Se debe ejecutar desde la raíz del proyecto con el comando:
// pnpm tsx scripts/init-new-hotel.ts <hotelId> <hotelName> <adminEmail> <password> [roleLevel]
// Para un hotel normal:
//   pnpm tsx scripts/init-new-hotel.ts hotel999 "Hotel Demo" marcelomst1@gmail.com miclave123
// Para crear hotelId: system técnico con rol 0:
//   pnpm tsx scripts/init-new-hotel.ts system "Sistema Técnico" marcelomst1@gmail.com miclave123 0

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
  const roleLevelArg = process.argv[6]; // 👈 opcional

  if (!hotelId || !hotelName || !adminEmail || !plainPassword) {
    console.error("❌ Uso: pnpm tsx scripts/init-new-hotel.ts <hotelId> <hotelName> <adminEmail> <password> [roleLevel]");
    process.exit(1);
  }

  const passwordHash = await hash(plainPassword, 10);
  const verificationToken = randomUUID();
  const roleLevel = roleLevelArg ? parseInt(roleLevelArg) : 10; // 👈 por defecto 10, pero permite 0

  const newConfig = {
    hotelId,
    hotelName,
    defaultLanguage: "es",
    timezone: "America/Argentina/Buenos_Aires",
    channelConfigs: {
      web: { enabled: true, mode: "supervised" },
    },
    users: [
      {
        email: adminEmail,
        passwordHash,
        roleLevel,
        active: false,
        verificationToken,
        createdAt: new Date().toISOString(),
      },
    ],
    emailSettings: {
      imapHost: "imap.gmail.com",
      imapPort: 993,
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      emailAddress: "begamshop.ventas@gmail.com",
      password: "umammswkuzoakqqu",
      secure: false,
    },
    lastUpdated: new Date().toISOString(),
  };

  await updateHotelConfig(hotelId, newConfig);
  console.log("✅ Hotel creado:", hotelId);
  console.log("👤 Usuario técnico/admin creado:", adminEmail);
  console.log("📧 Token de verificación:", verificationToken);
}

run();

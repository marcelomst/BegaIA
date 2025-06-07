// /root/begasist/scripts/restoreHotelConfigs.ts
// Restaura hoteles desde hotel_config-backup.json a la colección AstraDB 'hotel_config'
// Uso: pnpm tsx scripts/restore-hotel-configs.ts

import * as fs from "fs";
import * as path from "path";
import { getHotelConfigCollection } from "../lib/astra/connection";
import * as dotenv from "dotenv";
dotenv.config();

// Esto te asegura que funcione corras donde corras:
const backupPath = path.resolve(process.cwd(), "scripts/hotel_config-backup.json");

async function run() {
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Archivo no encontrado: ${backupPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupPath, "utf-8");
  let hotels: any[] = JSON.parse(raw);

  // Normaliza cada hotel
  hotels = hotels.map((hotel) => {
    // Elimina _id (Mongo, Astra, etc.)
    delete hotel._id;

    // Si hay emailSettings, fusiona dentro de channelConfigs.email si corresponde
    if (hotel.emailSettings) {
      hotel.channelConfigs = hotel.channelConfigs || {};
      hotel.channelConfigs.email = {
        ...(hotel.channelConfigs.email || {}),
        enabled: true,
        mode: hotel.channelConfigs.email?.mode || "supervised",
        dirEmail: hotel.emailSettings.emailAddress ?? hotel.channelConfigs.email?.dirEmail,
        password: hotel.emailSettings.password ?? hotel.channelConfigs.email?.password,
        imapHost: hotel.emailSettings.imapHost ?? hotel.channelConfigs.email?.imapHost,
        imapPort: hotel.emailSettings.imapPort ?? hotel.channelConfigs.email?.imapPort,
        smtpHost: hotel.emailSettings.smtpHost ?? hotel.channelConfigs.email?.smtpHost,
        smtpPort: hotel.emailSettings.smtpPort ?? hotel.channelConfigs.email?.smtpPort,
        secure: hotel.emailSettings.secure ?? hotel.channelConfigs.email?.secure,
      };
      delete hotel.emailSettings;
    }

    // Normaliza channelConfigs vacío si está ausente
    hotel.channelConfigs = hotel.channelConfigs || {};

    // Otros fixes según HotelConfig si necesitás...
    // (Ejemplo: asegura defaultLanguage y hotelName)
    hotel.defaultLanguage = hotel.defaultLanguage || "es";
    hotel.hotelName = hotel.hotelName || hotel.hotelId;

    // Elimina campos no válidos para HotelConfig si los hubiera (opcional)
    // delete hotel.foo;

    return hotel;
  });

  const collection = getHotelConfigCollection();

  // Inserta o actualiza cada hotel
  for (const hotelConfig of hotels) {
    // Upsert por hotelId (reemplaza o inserta)
    await collection.updateOne(
      { hotelId: hotelConfig.hotelId },
      { $set: hotelConfig },
      { upsert: true }
    );
    console.log("✅ Hotel restaurado:", hotelConfig.hotelId);
  }
}

run().catch((err) => {
  console.error("❌ Error restaurando configs:", err);
});

// /root/begasist/scripts/migrateHotelConfig.ts

import { getAstraDB } from "../lib/astra/connection";

async function runMigration() {
  const db = getAstraDB();
  const col = db.collection("hotel_config");
  const docs = await col.find({}).toArray();

  for (const doc of docs) {
    const update: any = {};
    let needsUpdate = false;

    // 1. Mover emailSettings a channelConfigs.email
    if (doc.emailSettings) {
      update.channelConfigs = {
        ...doc.channelConfigs,
        email: {
          enabled: true,
          mode: "supervised",
          dirEmail: doc.emailSettings.emailAddress,
          password: doc.emailSettings.password,
          imapHost: doc.emailSettings.imapHost,
          imapPort: doc.emailSettings.imapPort,
          smtpHost: doc.emailSettings.smtpHost,
          smtpPort: doc.emailSettings.smtpPort,
          secure: doc.emailSettings.secure ?? false,
          checkInterval: doc.emailSettings.checkInterval ?? 15000,
        },
        ...doc.channelConfigs,
      };
      update.emailSettings = null;
      needsUpdate = true;
    }

    // 2. Validar campos requeridos en channelConfigs.email
    if (update.channelConfigs?.email) {
      // Pon un password dummy si falta
      if (!update.channelConfigs.email.password) {
        update.channelConfigs.email.password = "REEMPLAZAR";
        needsUpdate = true;
      }
    }

    // 3. Actualizar documento
    if (needsUpdate) {
      // Elimina _id para evitar conflictos
      delete doc._id;
      await col.updateOne(
        { hotelId: doc.hotelId },
        { $set: { ...doc, ...update } }
      );
      console.log(`Migrado hotelId=${doc.hotelId}`);
    }
  }

  console.log("✅ Migración finalizada.");
}

runMigration().catch(console.error);

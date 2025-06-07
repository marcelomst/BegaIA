// /lib/config/initHotelConfig.ts
import { collection } from "./hotelConfig.server";
import type { HotelConfig } from "@/types/channel";

export async function initHotelConfig(hotelId: string) {
  const existing = await collection.findOne({ hotelId });

  if (existing) {
    console.log(`ℹ️ Configuración ya existente para ${hotelId}`);
    return;
  }

  const mockConfig: HotelConfig = {
    hotelId,
    hotelName: "Hotel de Prueba",
    defaultLanguage: "spa",
    timezone: "America/Montevideo",
    channelConfigs: {
      email: {
        enabled: true,
        mode: "supervised",
        dirEmail: "hotel@example.com",
        password: "123456", // 👈 ¡AGREGADO! (modifica por tu valor real)
        imapHost: "imap.gmail.com",
        smtpHost: "smtp.gmail.com",
        imapPort: 993,
        smtpPort: 587,
        secure: false,      // (opcional)
        checkInterval: 15000, // (opcional)
      },
      whatsapp: {
        enabled: true,
        mode: "supervised",
        celNumber: "+34123456789",
        apiKey: "api-key-opcional",
      },
      channelManager: {
        enabled: true,
        mode: "supervised",
        pollingInterval: 15000,
      },
      // Agregá aquí otros canales mock si querés inicializar más
    },
    lastUpdated: new Date().toISOString(),
  };

  // 🛡️ Validación de pollingInterval en channelManager
  if (mockConfig.channelConfigs.channelManager && "pollingInterval" in mockConfig.channelConfigs.channelManager) {
    const polling = mockConfig.channelConfigs.channelManager.pollingInterval;
    if (typeof polling !== "number" || polling < 5000) {
      console.warn(`⚠️ pollingInterval demasiado bajo (${polling} ms). Se ajusta a 15000 ms.`);
      mockConfig.channelConfigs.channelManager.pollingInterval = 15000;
    }
  }

  await collection.insertOne(mockConfig);
  console.log(`✅ Configuración inicial creada para ${hotelId}`);
}

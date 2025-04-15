// /lib/config/initHotelConfig.ts
import { HotelConfig, collection } from "./hotelConfig";

export async function initHotelConfig(hotelId: string) {
  const existing = await collection.findOne({ hotelId });

  if (existing) {
    console.log(`ℹ️ Configuración ya existente para ${hotelId}`);
    return;
  }

  const mockConfig: HotelConfig = {
    hotelId,
    channelConfigs: {
      email: {
        enabled: true,
        mode: "manual",
        imap: {
          host: "imap.gmail.com",
          port: 993,
          user: "hotel@example.com",
          password: "app-password",
        },
        smtp: {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
        },
      },
      whatsapp: {
        enabled: true,
        mode: "manual",
        botNumber: "+34 123 456 789",
      },
      channelManager: {
        enabled: true,
        mode: "manual",
        pollingInterval: 15000,
      },
    },
    lastUpdated: new Date().toISOString(),
  };

  await collection.insertOne(mockConfig);
  console.log(`✅ Configuración inicial creada para ${hotelId}`);
}

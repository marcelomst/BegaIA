// Path: /root/begasist/lib/entrypoints/whatsapp.ts
import dotenv from "dotenv";
dotenv.config();

const hotelId = process.env.HOTEL_ID;
if (!hotelId) {
  console.error("❌ Debes definir la variable de entorno HOTEL_ID para este proceso de WhatsApp.");
  process.exit(1);
}

import { getHotelConfig } from "../config/hotelConfig.server";
import { startWhatsAppBot } from "../services/whatsapp";

(async () => {
  // 🔥 Leer config real del canal WhatsApp
  const config = await getHotelConfig(hotelId);
  const celNumber = config?.channelConfigs?.whatsapp?.celNumber; // O el campo real que uses
  if (!celNumber) {
    console.error(`❌ El hotel ${hotelId} no tiene teléfono WhatsApp configurado en AstraDB.`);
    process.exit(1);
  }

  console.log(`🚀 Iniciando bot de WhatsApp para hotel: ${hotelId} (tel: ${celNumber})`);
  startWhatsAppBot({ hotelId, hotelPhone: celNumber });
})();

// Path: /root/begasist/lib/entrypoints/channelBot.ts

console.log("ENTRYPOINT START");

import { startWhatsAppBot } from "../services/whatsapp";
import { startEmailBot } from "../services/email";
import { startChannelManagerBot } from "../services/channelManager";
import { getHotelConfig } from "../config/hotelConfig.server";
import { isChannelEnabled } from "../config/isChannelEnabled"; // 🆕

/**
 * Lanza los bots/canales activos para UN hotel.
 * 
 * @param hotelId - ID único del hotel (string)
 */
export async function startHotelBot(hotelId: string) {
  try {
    const config = await getHotelConfig(hotelId);
    if (!config) {
      console.error(`[hotelBot] ❌ No se encontró configuración para hotelId=${hotelId}`);
      return;
    }
    console.log(`[hotelBot] 🚀 Iniciando bots para hotelId=${hotelId} (${config.hotelName})`);

    // --- WhatsApp
    // const whatsappCfg = config.channelConfigs?.whatsapp;
    // if (isChannelEnabled(config, "whatsapp") && whatsappCfg?.celNumber) {
    //   startWhatsAppBot({ hotelId, hotelPhone: whatsappCfg.celNumber });
    //   console.log(`[hotelBot] ✅ WhatsApp bot iniciado para ${hotelId}`);
    // } else {
    //   console.log(`[hotelBot] NO inicia WhatsApp bot para ${hotelId}`);
    // }

//    --- Email
    // if (isChannelEnabled(config, "email") && config.channelConfigs.email?.dirEmail) {
    //   startEmailBot({ hotelId, emailConf: config.channelConfigs.email });
    //   console.log(`[hotelBot] ✅  Email bot iniciado para ${hotelId}`);
    // } else {
      
    //   console.log(`[hotelBot] NO inicia Email bot para ${hotelId}`);
    // }

    // --- Channel Manager
    if (isChannelEnabled(config, "channelManager")) {
      try {
        startChannelManagerBot(hotelId);
        console.log(`[hotelBot] ✅ ChannelManager bot iniciado para ${hotelId}`);
      } catch (err) {
        console.error(`[hotelBot] ❌ Error al iniciar ChannelManager para ${hotelId}:`, err);
      }
    } else {
      console.log(`[hotelBot] NO inicia ChannelManager para ${hotelId}`);
    }
  } catch (err) {
    console.error("💥 Unhandled error at toplevel:", err);
  }
}

// 🚩 Ejecutá SIEMPRE al correr como script (ESM-safe)
const hotelId = process.env.HOTEL_ID;
if (!hotelId) {
  console.error("❌ HOTEL_ID no definido en process.env");
  process.exit(1);
}
startHotelBot(hotelId)
  .then(() => {
    console.log(`[hotelBot] Bots lanzados para ${hotelId}`);
  })
  .catch((err) => {
    console.error("[hotelBot] Error al iniciar bots:", err);
    process.exit(1);
  });

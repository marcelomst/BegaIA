// Path: /root/begasist/lib/entrypoints/channelBot.ts
console.log("ENTRYPOINT START");

import { startWhatsAppBot } from "../services/whatsapp";
import { startWhatsAppBot as startWhatsAppBotBaileys } from "../services/whatsapp.baileys";
import { startEmailBot } from "../services/email";
import { startChannelManagerBot } from "../services/channelManager";
import { getHotelConfig } from "../config/hotelConfig.server";
import { isChannelEnabled } from "../config/isChannelEnabled";

export async function startHotelBot(hotelId: string) {
  try {
    const config = await getHotelConfig(hotelId);
    if (!config) {
      console.error(`[hotelBot] ❌ No se encontró configuración para hotelId=${hotelId}`);
      return;
    }

    const transport = process.env.WA_TRANSPORT || "wwebjs";
    console.log(
      `[hotelBot] 🚀 Iniciando bots para hotelId=${hotelId} (${config.hotelName}) | WA transport=${transport}`
    );

    const whatsappCfg = config.channelConfigs?.whatsapp;
    const whatsappEnabled = isChannelEnabled(config, "whatsapp");
    console.log(
      `[hotelBot] ℹ️ WA gating → enabled=${whatsappEnabled} celNumber=${String(
        whatsappCfg?.celNumber || ""
      )}`
    );

    if (transport === "baileys") {
      console.log(`[hotelBot] 🔧 Forzando WhatsApp (Baileys) en DEV, ignorando gating`);
      // ⬇️ Baileys no recibe args (tu función no los define)
      await startWhatsAppBotBaileys();
      console.log(`[hotelBot] ✅ WhatsApp (DEV Baileys) iniciado para ${hotelId}`);
      return; // 👈 “solo WA” para enfocarnos en WhatsApp
    }

    if (whatsappEnabled && whatsappCfg?.celNumber) {
      startWhatsAppBot({ hotelId, hotelPhone: whatsappCfg.celNumber });
      console.log(`[hotelBot] ✅ WhatsApp (wwebjs) iniciado para ${hotelId}`);
    } else {
      console.log(
        `[hotelBot] NO inicia WhatsApp bot (enabled=${whatsappEnabled}, celNumber=${String(
          whatsappCfg?.celNumber || ""
        )})`
      );
    }

    // otros bots desactivados mientras enfocamos WA
  } catch (err) {
    console.error("💥 Unhandled error at toplevel:", err);
  }
}

const hotelId = process.env.HOTEL_ID;
if (!hotelId) {
  console.error("❌ HOTEL_ID no definido en process.env");
  process.exit(1);
}

(async () => {
  await startHotelBot(hotelId);
  console.log(`[hotelBot] Bots lanzados para ${hotelId}`);

  // Mantener vivo el proceso en Baileys (QR/updates)
  if ((process.env.WA_TRANSPORT || "wwebjs") === "baileys") {
    console.log("[hotelBot] ⏸️ Manteniendo proceso vivo para recibir QR/updates (Baileys) …");
    await new Promise<void>(() => {}); // bloquea indefinidamente
  }
})().catch((err) => {
  console.error("[hotelBot] Error al iniciar bots:", err);
  process.exit(1);
});

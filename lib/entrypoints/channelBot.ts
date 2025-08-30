// Path: /root/begasist/lib/entrypoints/channelBot.ts
console.log("ENTRYPOINT START");

import { startWhatsAppBot } from "../services/whatsapp";
import { startWhatsAppBot as startWhatsAppBotBaileys } from "../services/whatsapp.baileys";
import { startEmailBot } from "../services/email";
import { startChannelManagerBot } from "../services/channelManager";
import { getHotelConfig } from "../config/hotelConfig.server";
import { isChannelEnabled } from "../config/isChannelEnabled";
import { registerAdapter } from "@/lib/adapters/registry";
import { webAdapter } from "@/lib/adapters/webAdapter";

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

    // Lanzadores en paralelo (cada tarea es Promise<void>)
    const starters: Promise<void>[] = [];

    // === WhatsApp ===
    if (transport === "baileys") {
      console.log(`[hotelBot] 🔧 Forzando WhatsApp (Baileys) en DEV, ignorando gating`);
      starters.push(
        (async () => {
          await Promise.resolve(
            startWhatsAppBotBaileys({
              hotelId,
              hotelPhone: whatsappCfg?.celNumber, // opcional
            })
          );
          console.log(`[hotelBot] ✅ WhatsApp (Baileys) iniciado para ${hotelId}`);
        })()
      );
    } else if (whatsappEnabled && whatsappCfg?.celNumber) {
      starters.push(
        (async () => {
          await Promise.resolve(
            startWhatsAppBot({ hotelId, hotelPhone: whatsappCfg.celNumber })
          );
          console.log(`[hotelBot] ✅ WhatsApp (wwebjs) iniciado para ${hotelId}`);
        })()
      );
    } else {
      console.log(
        `[hotelBot] NO inicia WhatsApp bot (enabled=${whatsappEnabled}, celNumber=${String(
          whatsappCfg?.celNumber || ""
        )})`
      );
    }

    // === Channel Manager ===
    // Descomentar cuando quieras levantarlo junto a WA, usando el mismo patrón (sin .then)
    // starters.push(
    //   (async () => {
    //     await Promise.resolve(startChannelManagerBot(hotelId));
    //     console.log(`[hotelBot] ✅ ChannelManager iniciado para ${hotelId}`);
    //   })()
    // );

    // === Email ===
    // Descomentar cuando quieras levantarlo junto a WA, usando el mismo patrón (sin .then)
    // if (config.email) {
    //   starters.push(
    //     (async () => {
    //       await Promise.resolve(startEmailBot({ hotelId, emailConf: config.email }));
    //       console.log(`[hotelBot] ✅ Email iniciado para ${hotelId}`);
    //     })()
    //   );
    // }

    const results = await Promise.allSettled(starters);
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[hotelBot] ⚠️ Starter #${i} falló:`, r.reason);
      }
    });
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

  // Mantener vivo el proceso cuando usamos Baileys (QR/updates)
  if ((process.env.WA_TRANSPORT || "wwebjs") === "baileys") {
    console.log("[hotelBot] ⏸️ Manteniendo proceso vivo para recibir QR/updates (Baileys) …");
    await new Promise<void>(() => {}); // bloquea indefinidamente
  }
})().catch((err) => {
  console.error("[hotelBot] Error al iniciar bots:", err);
  process.exit(1);
});

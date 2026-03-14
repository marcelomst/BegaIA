// Path: /root/begasist/lib/entrypoints/email.ts
import "@/lib/utils/debugLog";

console.log("🟢 Entrando a email.ts");

process.on("uncaughtException", (err) => {
  console.error("💥 Excepción no capturada:");
  console.error("Tipo:", typeof err);
  console.error("Contenido:", err);
  console.error("Inspección profunda:", require("util").inspect(err, { depth: null, colors: true }));
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Promesa rechazada sin catch:");
  console.error("Tipo:", typeof reason);
  console.error("Contenido:", reason);
  console.error("Inspección profunda:", require("util").inspect(reason, { depth: null, colors: true }));
});

console.log("🛠️ Iniciando entrypoint email.ts");

import { startEmailBot } from "../../lib/services/email";
import { getHotelConfig } from "../config/hotelConfig.server"; // Ajustá el path si es necesario

const HOTEL_ID = process.env.HOTEL_ID || "hotelplaza"; // O el hotel que quieras testear

console.log("📥 startEmailBot importado");
(async () => {
  try {
    // Buscá la configuración real desde Astra
    const hotel = await getHotelConfig(HOTEL_ID);
    if (!hotel?.channelConfigs?.email) {
      throw new Error(`No hay configuración de email en el hotel ${HOTEL_ID}`);
    }

    console.log(`🚀 Iniciando bot de email para hotelId=${HOTEL_ID}`);
    await startEmailBot({ hotelId: HOTEL_ID, emailConf: hotel.channelConfigs.email });
  } catch (error) {
    console.error("⛔ Error en el bot de email:", error instanceof Error ? error.message : error);
    console.error(error); // 👈 esto imprime el stack completo
  }
})();

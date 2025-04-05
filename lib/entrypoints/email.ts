
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

console.log("📥 startEmailBot importado");
(async () => {
  try {
    console.log("🚀 Iniciando bot de email...");
    await startEmailBot();
  } catch (error) {
    console.error("⛔ Error en el bot de email:", error instanceof Error ? error.message : error);
    console.error(error); // 👈 esto imprime el stack completo
  }
})();
process.on("uncaughtException", (err) => {
    console.error("💥 Excepción no capturada:", err);
  });
  
  process.on("unhandledRejection", (reason) => {
    console.error("💥 Promesa rechazada sin catch:", reason);
  });
  
  console.log("🟢 Iniciando entrypoint all.ts...");
  
  import { startEmailBot } from "../services/email";
  import { startWhatsAppBot } from "../services/whatsapp";
  import { startChannelManagerBot } from "../services/channelManager";
  import { webMemory } from "@/lib/services/webMemory";
  
  async function startAll() {
    try {
      await Promise.all([
        // startEmailBot(),
        startWhatsAppBot(),
        // startChannelManagerBot(),
      ]);
      webMemory.clearMessages();
      console.log("🧹 Memoria web limpia");
      console.log("✅ Todos los canales iniciados correctamente.");
    } catch (err) {
      console.error("❌ Error al iniciar uno o más canales:", err);
    }
  }
  
  startAll();
  
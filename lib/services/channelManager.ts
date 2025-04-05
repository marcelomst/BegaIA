// lib/services/channelManager.ts
import { agentGraph } from "../agents";
import { HumanMessage } from "@langchain/core/messages";

const simulatedReservations = [
  "Quiero reservar una habitación doble para el 10 de junio al 12 de junio.",
  "¿Tienen disponibilidad para una suite del 5 al 7 de mayo?",
  "Necesito una habitación individual para esta noche.",
];

export async function startChannelManagerBot() {
  console.log("🛰️ [channelManager] Iniciado. Simulando reservas cada 15s...");

  setInterval(async () => {
    try {
      const randomMessage =
        simulatedReservations[Math.floor(Math.random() * simulatedReservations.length)];

      console.log("📥 [channelManager] Reserva simulada:", randomMessage);

      const response = await agentGraph.invoke({
        messages: [new HumanMessage(randomMessage)],
      });

      const reply = response.messages.at(-1)?.content;

      if (reply) {
        console.log("📤 [channelManager] Respuesta del asistente:", reply);
      }
    } catch (err) {
      console.error("⛔ [channelManager] Error procesando reserva:", err);
    }
  }, 15000);
}

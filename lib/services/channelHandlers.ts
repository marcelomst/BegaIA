// /root/begasist/lib/services/channelHandlers.ts

import { Message } from "@/types/message";

// 🔧 Define la interfaz que deben implementar todos los handlers
export interface ChannelHandler {
  process: (msg: Message) => Promise<void>;
}

// 🧩 Handler para canal Web
const webHandler: ChannelHandler = {
  async process(msg) {
    console.log("🌐 [webHandler] Procesando mensaje:", msg.id);
    // Aquí podrías guardar el mensaje, actualizar estado, etc.
    // Ejemplo:
    // await saveMessageToAstra(msg);
  },
};

// 📩 Handler para canal Email
const emailHandler: ChannelHandler = {
  async process(msg) {
    console.log("📧 [emailHandler] Procesando mensaje:", msg.id);
    // Lógica propia del canal email
  },
};

// 💬 Handler para canal WhatsApp
const whatsappHandler: ChannelHandler = {
  async process(msg) {
    console.log("📱 [whatsappHandler] Procesando mensaje:", msg.id);
    // Lógica específica para WhatsApp
  },
};

// 🛰️ Handler para Channel Manager
const channelManagerHandler: ChannelHandler = {
  async process(msg) {
    console.log("📡 [channelManagerHandler] Procesando mensaje:", msg.id);
    // Procesamiento de reservas u otros eventos desde el channel manager
  },
};

// 🧭 Registro global de handlers (💡 extensible)
export const channelHandlers = {
  web: webHandler,
  email: emailHandler,
  whatsapp: whatsappHandler,
  channelManager: channelManagerHandler,
} as const;

// 🏷️ Tipo derivado de los canales registrados
export type Channel = keyof typeof channelHandlers;

// /root/begasist/types/channel.ts

// 🛡️ Definiciones básicas de canal, modo y estados
export type ChannelMode = "supervised" | "automatic";
export type MessageStatus = "pending" | "sent" | "rejected" | "expired";
export const ALL_CHANNELS = ["web", "email", "whatsapp", "channelManager"] as const;
export type Channel = typeof ALL_CHANNELS[number];
import type { HotelUser } from "./user";


// 🛠️ Configuraciones básicas por canal
export type BaseChannelConfig = {
  enabled: boolean;
  mode: ChannelMode;
};

export type WhatsAppConfig = BaseChannelConfig & {
  celNumber: string;
  apiKey?: string; // opcional si usamos integraciones reales
};

export type EmailConfig = BaseChannelConfig & {
  dirEmail: string;
  imapHost: string;
  smtpHost: string;
  imapPort: number;
  smtpPort: number;
};

export type ChannelManagerConfig = BaseChannelConfig & {
  pollingInterval: number;
};

export type ChannelConfigMap = {
  web: BaseChannelConfig;
  whatsapp: WhatsAppConfig;
  email: EmailConfig;
  channelManager: ChannelManagerConfig; // ✅ Ahora acepta pollingInterval
};



// 🏨 Configuración general del hotel
export type HotelConfig = {
  hotelId: string;
  hotelName: string;
  defaultLanguage: string;
  timezone: string;
  channelConfigs: Partial<ChannelConfigMap>;
  users?: HotelUser[];
  emailSettings?: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    emailAddress: string;
  };
  whatsappSettings?: {
    number: string;
    apiKey?: string;
  };
  retrievalSettings?: {
    useAstra: boolean;
    fallbackUrl?: string;
  };
  lastUpdated?: string;
};

// 💬 Mensaje de canal
export interface ChannelMessage {
  messageId: string;        // ID lógico único
  conversationId?: string;  // opcional, para agrupar hilos
  hotelId: string;
  channel: Channel;
  sender: string;
  content: string;
  timestamp: string;        // formato ISO
  time: string;             // hora legible
  suggestion: string;       // sugerencia original del asistente
  approvedResponse?: string; // respuesta aprobada por el recepcionista
  respondedBy?: string;     // email o identificador del recepcionista
  status: MessageStatus;    // pending, sent, rejected, expired
}


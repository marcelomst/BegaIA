// /root/begasist/types/channel.ts

export type ChannelMode = "supervised" | "automatic";
export type MessageStatus = "pending" | "sent" | "rejected" | "expired";

export const ALL_CHANNELS = [
  "web",
  "email",
  "whatsapp",
  "channelManager",
  "tiktok",
  "telegram",
  "instagram",
  "x",        // X (antes Twitter)
  "facebook",
] as const;

export type Channel = typeof ALL_CHANNELS[number];
import type { HotelUser } from "./user";

export type BaseChannelConfig = {
  enabled: boolean;
  mode: ChannelMode;
};

export type WhatsAppConfig = BaseChannelConfig & {
  celNumber: string;
  apiKey?: string;
};

export type EmailConfig = BaseChannelConfig & {
  dirEmail: string;
  password: string; // Puedes dejar este campo
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  secure?: boolean;
  checkInterval?: number;
};

export type ChannelManagerConfig = BaseChannelConfig & {
  pollingInterval: number;
};

export type TelegramConfig = BaseChannelConfig & {
  botToken: string;
  chatId?: string;
};

export type InstagramConfig = BaseChannelConfig & {
  accessToken: string;
  pageId?: string;
};

export type TikTokConfig = BaseChannelConfig & {
  accessToken: string;
  accountId?: string;
};

export type XConfig = BaseChannelConfig & {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
};

export type FacebookConfig = BaseChannelConfig & {
  pageToken: string;
  pageId?: string;
};

// Si querés un campo genérico, podés dejarlo, pero recomiendo usar los específicos para producción
export type ChannelConfigMap = {
  web: BaseChannelConfig;
  whatsapp: WhatsAppConfig;
  email: EmailConfig;
  channelManager: ChannelManagerConfig;
  telegram: TelegramConfig;
  instagram: InstagramConfig;
  tiktok: TikTokConfig;
  x: XConfig;
  facebook: FacebookConfig;
};

export type HotelConfig = {
  hotelId: string;
  hotelName: string;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  defaultLanguage: string;
  timezone: string;
  iso3to1?: Record<string, string>;
  channelConfigs: Partial<ChannelConfigMap>;
  users?: HotelUser[];
  verification?: {
    baseUrl?: string;
  };
  retrievalSettings?: {
    useAstra: boolean;
    fallbackUrl?: string;
  };
  lastUpdated?: string;
};

export interface ChannelMessage {
  messageId: string;
  conversationId?: string;
  hotelId: string;
  channel: Channel;
  sender: string;
  content: string;
  timestamp: string;
  time: string;
  suggestion: string;
  approvedResponse?: string;
  respondedBy?: string;
  status: MessageStatus;
  guestId?: string;    // ← AGREGALO
}

export interface Conversation {
  conversationId: string; // UUID generado al iniciar conversación
  hotelId: string;
  channel: Channel; // "web", "whatsapp", etc.
  startedAt: string; // ISO date
  lastUpdatedAt: string; // ISO date
  lang: string; // idioma preferido de la conversación
  userId?: string; // si es usuario logueado, opcional
  guestId?: string; // para guests anónimos, puedes usar UUID (en cookie)
  status?: "active" | "closed" | "archived";
  metadata?: Record<string, any>; // extensible para otras necesidades
  subject?: string | null; // Asunto de la conversación, opcional
}
export type ChatTurn = {
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

export type ConversationSummary = {
  conversationId: string;
  startedAt: string;
  lastUpdatedAt: string;
  lang: string;
  status: string;
  subject?: string;
};

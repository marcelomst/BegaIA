// Path: /root/begasist/types/channel.ts

import type { HotelUser } from "./user";

// 🧩 Core types (modularizados para claridad)
import {
  ChannelMode,
  MessageStatus,
  ChannelId,
  Channel,
  ALL_CHANNELS,
  ChannelStatusKey,
  LANGUAGE_OPTIONS,
} from "./channel.core";

// Re-export de los tipos base para mantener compatibilidad con imports existentes
export type {
  ChannelMode,
  MessageStatus,
  ChannelId,
  Channel,
  ChannelStatusKey,
} from "./channel.core";

export {
  ALL_CHANNELS,
  LANGUAGE_OPTIONS,
} from "./channel.core";

// --- IMPORTACIÓN Y REEXPORTACIÓN DE TIPOS NUEVOS ---
// Tipos minimalistas de reserva y eventos del Channel Manager
import type { Reservation, ReservationStatus } from "./reservation";
import type { CmEvent, CmEventType, CmEventStatus } from "./cmEvent";

export type {
  Reservation,
  ReservationStatus,
  CmEvent,
  CmEventType,
  CmEventStatus,
};

// ⚙️ Extensión mínima para banderas de reservas
export type ReservationsFlags = {
  /** Si true, el flujo de reservas insertará SIEMPRE la “pregunta canónica” al completar slots */
  forceCanonicalQuestion?: boolean;
};

// --- CONFIGS DE CANAL ---
export type BaseChannelConfig = {
  enabled: boolean;
  mode: ChannelMode;
  /** Banderas específicas del flujo de reservas para este canal */
  reservations?: ReservationsFlags;
};

export type WhatsAppConfig = BaseChannelConfig & {
  celNumber: string;
  apiKey?: string;
  /** Si true, no procesa mensajes de grupos (@g.us). Default: true */
  ignoreGroups?: boolean;
};

export type EmailConfig = BaseChannelConfig & {
  dirEmail: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  secure?: boolean;
  checkInterval?: number;
  preferredCurationModel?: "gpt-3.5-turbo" | "gpt-4" | "gpt-4o";
};

export type ChannelManagerConfig = BaseChannelConfig & {
  pollingInterval: number;
  endpointUrl?: string;     // URL WSDL de SiteMinder
  username?: string;        // Usuario WS-Security
  password?: string;        // Clave WS-Security
  requestorId?: string;     // Identificador en SiteConnect
  mode?: ChannelMode;       // automatic | supervised
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

// --- HOTEL ---
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
  verification?: { baseUrl?: string };
  retrievalSettings?: { useAstra: boolean; fallbackUrl?: string };
  /** Banderas globales del flujo de reservas del hotel */
  reservations?: ReservationsFlags;
  lastUpdated?: string;
};

// --- CONVERSACIONES Y MENSAJES ---
export type ChatTurn = {
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

export type ChatTurnWithMeta = ChatTurn & {
  status?: string;
  respondedBy?: string;
  approvedResponse?: string;
  suggestion?: string;
  messageId?: string;
  subject?: string;
  recipient?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { filename: string }[];
  originalMessageId?: string;
};

export type ConversationSummary = {
  conversationId: string;
  startedAt: string;
  lastUpdatedAt: string;
  lang: string;
  status: string;
  subject?: string;
  guestId?: string;
  channel?: Channel;
};

export type GuestMode = "automatic" | "supervised";
export type CurationModel = "gpt-3.5-turbo" | "gpt-4" | "gpt-4o";

export interface ChannelMessage {
  messageId: string;
  conversationId?: string;
  hotelId: string;
  channel: Channel;
  sender: string;
  content: string;
  timestamp: string;
  time?: string;
  suggestion?: string;
  approvedResponse?: string;
  respondedBy?: string;
  status?: MessageStatus;
  guestId?: string;
  deliveredAt?: string;
  deliveryAttempts?: number;
  deliveryError?: string;
  role?: "user" | "ai";
  subject?: string;
  recipient?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
  references?: string[];
  inReplyTo?: string;
  originalMessageId?: string;
  isForwarded?: boolean;
  /** Vincula el mensaje con una reserva concreta (si aplica) */
  reservationId?: string;
  /** Análisis de sentimiento del contenido (opcional) */
  sentiment?: "positive" | "neutral" | "negative";
  detectedLanguage?: string;

  // 🆕 idempotencia / normalización cross-canal
  sourceMsgId?: string;
  direction?: "in" | "out";    // si falta, se deriva de sender/role
  sourceProvider?: string;     // p.ej. "web" | "whatsapp.baileys" | "email"
  audit?: {
    pre?: any;
    llm?: any;
    verdict?: any;
  };

}

export interface Conversation {
  conversationId: string;
  hotelId: string;
  channel: Channel;
  startedAt: string;
  lastUpdatedAt: string;
  lang: string;
  userId?: string;
  guestId?: string;
  status?: "active" | "closed" | "archived" | "ignored";
  metadata?: Record<string, any>;
  subject?: string | null;
  /** Identificador de la reserva asociada a la conversación (opcional) */
  reservationId?: string;
}

// --- HUÉSPEDES (unificado) ---
type ExternalRefs = {
  pmsId?: string;
  cmId?: string;
  ota?: Record<string, string>;
};

export type Identifier = {
  type: "email" | "phone" | "doc" | "wa" | "web_id";
  value: string;
  verified?: boolean;
  source?: "pms" | "cm" | "ota" | "ha";
};

export interface Guest {
  guestId: string;
  hotelId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  channel?: Channel;
  reservationIds?: string[];
  createdAt: string;
  updatedAt?: string;
  mode?: GuestMode;
  tags?: string[];
  mergedIds?: string[];
  nationality?: string;
  language?: string;
  checkInDates?: string[];
  checkOutDates?: string[];
  birthdate?: string;
  loyaltyId?: string;
  vipLevel?: string;

  /** IDs alternativos útiles para “deduplicar” (email, wa, phone, rawId, etc.) */
  aliases?: string[];
  /** Identificadores normalizados (modelo objeto, no array) */
  identifiers?: {
    email?: string;
    phoneE164?: string;
    whatsappId?: string; // mapea "wa"
    doc?: string;
    web_id?: string;
    primary?: "email" | "phone" | "wa" | "doc" | "web_id";
  };

  // 🔹 Historial enriquecido (source/verified)
  identifiersHistory?: Identifier[];
}

// --- BASE EVENT PAYLOAD ---
export interface BaseEventPayload {
  reservationId?: string;
  guestId?: string;
  channel: Channel;
  timestamp: string;
  rawPayload?: any;
}

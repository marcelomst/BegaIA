// Path: /root/begasist/types/channel.ts

import type { HotelUser } from "./user";
import type { RichPayload } from "./richPayload";
import type { ManualPOIRecord } from "./poi";

// 🧩 Core types (modularizados para claridad)
import type {
  ChannelMode,
  MessageStatus,
  ChannelId,
  Channel,
  ChannelStatusKey,
} from "./channel.core";
import { ALL_CHANNELS, LANGUAGE_OPTIONS } from "./channel.core";

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
  slaMinutes?: number;
  /** Si true, no procesa mensajes de grupos (@g.us). Default: true */
  ignoreGroups?: boolean;
};

export type EmailConfig = BaseChannelConfig & {
  /** Dirección de correo usada para autenticar y enviar */
  dirEmail: string;
  /**
   * Password SMTP inline (LEGACY). Evitar persistir en DB; será eliminado a futuro.
   * Preferir secretRef para resolver desde un almacén seguro / env.
   */
  password?: string;
  /** Identificador lógico para buscar credenciales externas (e.g. "hotel123-main"). */
  secretRef?: string;
  /** Estrategia explícita (opcional) para debug/migración */
  credentialsStrategy?: "inline" | "ref";
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
export type CancellationPolicy =
  | string
  | {
    flexible?: string;
    nonRefundable?: string;
    channels?: string[]; // can also be string in legacy, hydration will coerce
    noShow?: string;
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
  verification?: { baseUrl?: string };
  retrievalSettings?: { useAstra: boolean; fallbackUrl?: string };
  /** Banderas globales del flujo de reservas del hotel */
  reservations?: ReservationsFlags;
  lastUpdated?: string;
  // 🆕 Canon (1–6) + rooms
  contacts?: {
    email?: string;
    whatsapp?: string;
    phone?: string;
    website?: string;
    supportHours?: string;
    supportEscalation?: string;
  };
  schedules?: { checkIn?: string; checkOut?: string; breakfast?: string; quietHours?: string };
  amenities?: {
    // Nuevo modelo unificado
    tags?: string[]; // p.ej. ["Estacionamiento","Piscina","Gimnasio","Spa", ...]
    schedules?: Record<string, string>; // mapa amenity-> "HH:mm" o "HH:mm a HH:mm"
    notes?: string; // notas generales (agrupa parkingNotes u otras observaciones)
    // Compat: campos legacy aún soportados en carga (se migran a tags/schedules en UI)
    hasParking?: boolean; parkingNotes?: string;
    hasPool?: boolean; poolSchedule?: string;
    hasGym?: boolean; gymSchedule?: string;
    hasSpa?: boolean; spaSchedule?: string;
    other?: string[];
  };
  payments?: { methods?: string[]; notes?: string; notesTags?: string[]; requiresCardForBooking?: boolean; currency?: string; currencies?: string[] };
  billing?: { issuesInvoices?: boolean; invoiceNotes?: string; invoiceNotesTags?: string[] };
  policies?: { pets?: string; smoking?: string; generalTags?: string[]; cancellation?: CancellationPolicy };
  rooms?: Array<{
    name: string;
    sizeM2?: number; capacity?: number; beds?: string;
    description?: string; highlights?: string[]; images?: string[]; icon?: string; accessible?: boolean;
  }>;
  hotelProfile?: {
    shortDescription?: string;
    style?: string;
    starRating?: number;
    propertyType?: string;
    brand?: string;
  };
  // 🆕 Campos opcionales para KB enriquecida
  airports?: Array<{ code?: string; name?: string; distanceKm?: number; driveTime?: string }>;
  transport?: { hasPrivateTransfer?: boolean; transferNotes?: string; taxiNotes?: string; busNotes?: string };
  attractions?: Array<{ name?: string; distanceKm?: number; driveTime?: string; notes?: string; placeId?: string; photoName?: string }>;
  touristEvents?: Array<{
    /** Referencia opcional al evento base en POI (_id) */
    poiRefId?: string;
    name?: string;
    /** Nota editorial local del hotel (curaduría) */
    notes?: string;
    startsAt?: string;
    endsAt?: string;
    venue?: string;
    sourceUrl?: string;
    /** Prioridad local para ordenar sugerencias (mayor = primero) */
    priority?: number;
    /** Oculta el evento en la vista local del hotel */
    hidden?: boolean;
    images?: Array<{ url: string; alt?: string }>;
  }>;
  /** Información propia del hotel para llegada, transporte y atracciones */
  arrivalInfo?: string;
  transportInfo?: string;
  attractionsInfo?: string;
  /** Preferencia de respuesta para puntos de interés */
  nearbyPointsMode?: "auto" | "always" | "text" | "carousel";
  /** Región de eventos del hotel (p.ej. "maldonado_uy") */
  eventsRegion?: string;
  /** Proveedor global de eventos (fallback) */
  globalEventsProvider?: "places" | "none";
  /** Curaduría regional de POIs (colección global `poi`) */
  poiOverrides?: {
    featuredPoiIds?: string[];
    hiddenPoiIds?: string[];
    customPois?: ManualPOIRecord[];
  };
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
  conversationId?: string;
  guestId?: string;
  originalContent?: string;
  subject?: string;
  recipient?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { filename: string }[];
  originalMessageId?: string;
  responseTrace?: {
    category?: string | null;
    promptKey?: string | null;
    contentVersion?: string | null;
    source?: string | null;
  };
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

  // 🆕 payload enriquecido opcional para UI (renderers locales)
  rich?: RichPayload;
  /** Metadata técnico opcional por mensaje (auditoría/trazas) */
  meta?: Record<string, any>;

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

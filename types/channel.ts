// Path: /root/begasist/types/channel.ts

import type { HotelUser } from "./user";

// --- MODOS DE CANALES Y MENSAJES ---
export type ChannelMode = "supervised" | "automatic";
export type MessageStatus = "pending" | "sent" | "rejected" | "expired"|"ignored"|"approved"|"delivered"|"failed";

// --- LISTADO Y TIPADO DE CANALES ---
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

export type ChannelId = typeof ALL_CHANNELS[number]; // "web" | "email" | ...
export type Channel = ChannelId; // Alias por si usás Channel en otros lados

// --- ESTADOS DE CANAL (PARA UI Y BACKEND) ---
export type ChannelStatusKey =
  | "active"
  | "disabled"
  | "supervised"
  | "automatic"
  | "connected"
  | "developing"
  | "waitingQr"
  | "disconnected"
  | "notConfigured"
  | "unknown";

// --- CONFIGS DE CANAL ---
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
  verification?: {
    baseUrl?: string;
  };
  retrievalSettings?: {
    useAstra: boolean;
    fallbackUrl?: string;
  };
  lastUpdated?: string;
};

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
  // NUEVO - sólo para canales que lo usan:
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

export interface Guest {
  guestId: string;
  hotelId: string;
  name?: string;
  createdAt: string;
  updatedAt?: string;
  mode?: GuestMode;
  tags?: string[];
  email?: string;
  phone?: string;
  mergedIds?: string[];
}
// --- MENSAJES Y CONVERSACIONES ---
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
  guestId?: string;
  deliveredAt?: string;
  deliveryAttempts?: number;
  deliveryError?: string;
  role?: "user" | "ai";

  // --- EXTENSIONES MULTICANAL ---
  // Email y otros canales con metadata
  subject?: string;           // Email: asunto (puede cambiar por mensaje)
  recipient?: string;         // Destinatario principal (TO)
  cc?: string[];              // Copia
  bcc?: string[];             // Copia oculta
  attachments?: any[];        // Archivos adjuntos
  references?: string[];      // IDs de mensajes previos (reply, hilos)
  inReplyTo?: string;         // Mensaje al que responde
  originalMessageId?: string; // Mensaje original si es forward/reenviado
  isForwarded?: boolean;      // Es un reenvío
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
  status?: "active" | "closed" | "archived"|"ignored";
  metadata?: Record<string, any>;
  subject?: string | null;
}
// De aqui para abajo son types nuevos que no estan incorporados al 
// flujo que ya funciona

// --- RESERVA / BOOKING ---
export type ReservationStatus = 'new' | 'modified' | 'cancelled';

export interface ReservationDTO {
  reservationId: string;         // ID único de la reserva (OTA/CM/PMS)
  hotelId: string;               // Hotel asociado
  channel: Channel;              // Origen de la reserva (ej: 'booking.com', 'whatsapp', ...)
  guest: Guest;                  // Datos del huésped
  checkIn: string;               // Fecha de llegada (ISO)
  checkOut: string;              // Fecha de salida (ISO)
  roomType: string;              // Código o nombre del tipo de habitación
  ratePlan: string;              // Código o nombre del plan de tarifa
  status: ReservationStatus;     // Estado de la reserva
  bookingTimestamp: string;      // Fecha/hora de la reserva (ISO)
  specialRequests?: string;      // Solicitudes especiales del huésped
  guestComment?: string;         // Comentario inicial (“¿Tienen cuna?”)
  rawPayload?: any;              // Payload original (XML/JSON) para debug
}

// --- MENSAJE / COMUNICACIÓN ---
export type MessageSource =
  | 'guest_comment'
  | 'guest_review'
  | 'pms'
  | 'receptionist'
  | 'ha'
  | 'cm'
  | 'ota'
  | 'other';

export type MessageDirection = 'incoming' | 'outgoing';

export interface ChannelMessageDTO {
  messageId: string;             // ID único del mensaje
  conversationId?: string;       // Conversación asociada, si aplica
  reservationId?: string;        // Reserva asociada, si aplica
  guestId?: string;              // Huésped asociado, si aplica
  channel: Channel;              // Canal por el que llegó/salió el mensaje
  source: MessageSource;         // Origen lógico del mensaje
  direction: MessageDirection;   // 'incoming' o 'outgoing'
  timestamp: string;             // Fecha/hora del mensaje (ISO)
  content: string;               // Texto del mensaje
  relatedTo?: string;            // ID de mensaje/reserva al que responde
  suggestionByHA?: string;       // Sugerencia de respuesta generada por HA
  status: MessageStatus;         // Estado interno (pending, sent, etc.)
  rawPayload?: any;              // Payload original (por ejemplo XML/JSON) para debug
}


// --- OPINIÓN / REVIEW ---
export interface GuestReviewDTO {
  reviewId: string;              // ID único de la opinión/reseña
  reservationId?: string;        // Reserva asociada, si aplica
  guestId?: string;              // Huésped asociado, si aplica
  channel: Channel;              // Canal donde se originó la opinión
  source: 'ota' | 'pms' | 'cm' | 'guest'; // Origen del dato
  rating?: number;               // Puntuación (estrellas, escala, etc.)
  content: string;               // Texto de la opinión
  timestamp: string;             // Fecha/hora de la opinión (ISO)
  analyzedSentiment?: 'positive' | 'neutral' | 'negative'; // Análisis de sentimiento
  haSuggestion?: string;         // Sugerencia de respuesta o acción por IA
  responded?: boolean;           // Si ya se respondió la opinión
  responseContent?: string;      // Texto de la respuesta enviada
  responseTimestamp?: string;    // Fecha/hora de la respuesta (ISO)
  rawPayload?: any;              // Payload original (XML/JSON) para debug
}

// --- EVENTO CHANNEL MANAGER ---
export type CMEventType =
  | 'reservation_created'
  | 'reservation_modified'
  | 'reservation_cancelled'
  | 'guest_message'
  | 'guest_review'
  | 'availability_update'
  | 'rate_update'
  | 'other';

export interface ChannelManagerEventDTO {
  eventId: string;               // ID único del evento
  eventType: CMEventType;        // Tipo de evento
  channel: Channel;              // Canal origen (ej: 'booking.com', 'whatsapp', ...)
  reservationId?: string;        // Reserva asociada, si aplica
  guestId?: string;              // Huésped asociado, si aplica
  payload: any;                  // Datos originales del evento (DTO específico)
  receivedAt: string;            // Fecha/hora de recepción del evento (ISO)
  processedByHA?: boolean;       // Indica si HA ya procesó este evento
}

// --- DISPONIBILIDAD Y TARIFAS (ARI) ---
export interface AvailabilityQueryDTO {
  queryId: string;             // ID único de la consulta
  channel: Channel;            // Canal donde se hizo la consulta
  guestId?: string;            // Huésped asociado, si aplica
  askedBy: 'guest' | 'receptionist' | 'ota' | 'ha' | 'web';
  checkIn: string;             // Fecha de entrada (YYYY-MM-DD)
  checkOut: string;            // Fecha de salida (YYYY-MM-DD)
  roomType?: string;           // Tipo de habitación, si se especificó
  guests?: number;             // Adultos
  children?: number;           // Niños
  timestamp: string;           // Cuándo se hizo la consulta (ISO)
  rawPayload?: any;            // Payload original (por ejemplo, params del canal)
}

export interface RatePlanAvailabilityDTO {
  ratePlanId: string;          // Código del plan de tarifa
  name: string;                // Nombre legible del plan
  pricePerNight: number;       // Precio por noche
  totalPrice: number;          // Precio total para el periodo
  available: boolean;          // ¿Hay disponibilidad?
  restrictions?: string[];     // Ej: ["minStay:2", "noCheckIn", ...]
  cancellationPolicy?: string; // Texto de la política de cancelación
  mealPlan?: string;           // Ej: "Desayuno incluido"
}

export interface AvailabilityResultDTO {
  queryId: string;                           // ID de la consulta original
  hotelId: string;                           // Hotel consultado
  channel: Channel;                          // Canal que solicitó
  roomType: string;                          // Tipo de habitación consultado
  availableRooms: number;                    // Número de habitaciones libres
  ratePlans: RatePlanAvailabilityDTO[];      // Detalle por plan de tarifa
  restrictions?: string[];                   // Restricciones generales
  currency: string;                          // Moneda (ISO)
  period: { checkIn: string; checkOut: string }; // Fechas consultadas
  source: 'pms' | 'cm' | 'ota' | 'cache';     // Origen de los datos
  fetchedAt: string;                         // Cuándo se obtuvieron los datos (ISO)
  rawPayload?: any;                          // Payload original (XML/JSON) para debug
}


// --- CATÁLOGO DE ROOM TYPES Y RATE PLANS ---

export interface RoomTypeDTO {
  roomTypeCode: string;        // Código único del tipo de habitación
  name: string;                // Nombre comercial (ej: “Suite Doble Deluxe”)
  maxOccupancy: number;        // Capacidad máxima (adultos + niños)
  description?: string;        // Descripción opcional
  amenities?: string[];        // Lista de amenities (opcional)
}

export interface RatePlanDTO {
  ratePlanCode: string;        // Código único del plan de tarifa
  name: string;                // Nombre visible (ej: “No Reembolsable”, “Desayuno Incluido”)
  description?: string;        // Descripción opcional
  cancellationPolicy?: string; // Política de cancelación
  mealPlan?: string;           // Ej: “Sólo alojamiento”, “Media pensión”
}

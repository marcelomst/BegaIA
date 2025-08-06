// Path: /root/begasist/types/externalDTOs.ts

import type { Channel, MessageStatus } from "./channel";
import type { Guest } from "./channel";

// --- RESERVA / BOOKING ---
export type ReservationStatus = "new" | "modified" | "cancelled";

export interface ReservationDTO {
  reservationId: string;
  hotelId: string;
  channel: Channel;
  guest: Guest;
  checkIn: string;
  checkOut: string;
  roomType: string;
  ratePlan: string;
  status: ReservationStatus;
  bookingTimestamp: string;
  specialRequests?: string;
  guestComment?: string;
  rawPayload?: any;
}

// --- MENSAJE / COMUNICACIÓN ---
export type MessageSource =
  | "guest_comment"
  | "guest_review"
  | "pms"
  | "receptionist"
  | "ha"
  | "cm"
  | "ota"
  | "other";

export type MessageDirection = "incoming" | "outgoing";

export interface ChannelMessageDTO {
  messageId: string;
  conversationId?: string;
  reservationId?: string;
  guestId?: string;
  channel: Channel;
  source: MessageSource;
  direction: MessageDirection;
  timestamp: string;
  content: string;
  relatedTo?: string;
  suggestionByHA?: string;
  status: MessageStatus;
  rawPayload?: any;
}

// --- OPINIÓN / REVIEW ---
export interface GuestReviewDTO {
  reviewId: string;
  reservationId?: string;
  guestId?: string;
  channel: Channel;
  source: "ota" | "pms" | "cm" | "guest";
  rating?: number;
  content: string;
  timestamp: string;
  analyzedSentiment?: "positive" | "neutral" | "negative";
  haSuggestion?: string;
  responded?: boolean;
  responseContent?: string;
  responseTimestamp?: string;
  rawPayload?: any;
}

// --- EVENTO CHANNEL MANAGER ---
export type CMEventType =
  | "reservation_created"
  | "reservation_modified"
  | "reservation_cancelled"
  | "guest_message"
  | "guest_review"
  | "availability_update"
  | "rate_update"
  | "other";

export interface ChannelManagerEventDTO {
  eventId: string;
  eventType: CMEventType;
  channel: Channel;
  reservationId?: string;
  guestId?: string;
  payload: any;
  receivedAt: string;
  processedByHA?: boolean;
}

// --- DISPONIBILIDAD Y TARIFAS (ARI) ---
export interface AvailabilityQueryDTO {
  queryId: string;
  channel: Channel;
  guestId?: string;
  askedBy: "guest" | "receptionist" | "ota" | "ha" | "web";
  checkIn: string;
  checkOut: string;
  roomType?: string;
  guests?: number;
  children?: number;
  timestamp: string;
  rawPayload?: any;
}

export interface RatePlanAvailabilityDTO {
  ratePlanId: string;
  name: string;
  pricePerNight: number;
  totalPrice: number;
  available: boolean;
  restrictions?: string[];
  cancellationPolicy?: string;
  mealPlan?: string;
}

export interface AvailabilityResultDTO {
  queryId: string;
  hotelId: string;
  channel: Channel;
  roomType: string;
  availableRooms: number;
  ratePlans: RatePlanAvailabilityDTO[];
  restrictions?: string[];
  currency: string;
  period: { checkIn: string; checkOut: string };
  source: "pms" | "cm" | "ota" | "cache";
  fetchedAt: string;
  rawPayload?: any;
}

// --- CATÁLOGO DE ROOM TYPES Y RATE PLANS ---
export interface RoomTypeDTO {
  roomTypeCode: string;
  name: string;
  maxOccupancy: number;
  description?: string;
  amenities?: string[];
}

export interface RatePlanDTO {
  ratePlanCode: string;
  name: string;
  description?: string;
  cancellationPolicy?: string;
  mealPlan?: string;
}

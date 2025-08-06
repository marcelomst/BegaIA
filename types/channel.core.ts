// Path: /root/begasist/types/channel.core.ts

// --- MODOS DE CANALES Y MENSAJES ---
export type ChannelMode = "supervised" | "automatic";
export type MessageStatus =
  | "pending"
  | "sent"
  | "rejected"
  | "expired"
  | "ignored"
  | "approved"
  | "delivered"
  | "failed";

// --- LISTADO Y TIPADO DE CANALES ---
export const ALL_CHANNELS = [
  "web",
  "email",
  "whatsapp",
  "channelManager",
  "tiktok",
  "telegram",
  "instagram",
  "x", // X (antes Twitter)
  "facebook",
] as const;
export const LANGUAGE_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
] as const;

export type ChannelId = typeof ALL_CHANNELS[number];
export type Channel = ChannelId;

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

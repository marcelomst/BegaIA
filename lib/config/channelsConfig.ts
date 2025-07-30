// Path: /root/begasist/lib/config/channelsConfig.ts

// Centraliza los canales y sus propiedades para paneles y UI.
// Si sumás más canales, sólo agregá aquí y el frontend se actualiza.

export type ChannelId =
  | "overview"
  | "web"
  | "email"
  | "whatsapp"
  | "channelManager"
  // Para expansión futura:
  | "telegram"
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "unknown";

export interface ChannelConfig {
  id: ChannelId;
  label: string;
  icon: string; // ruta al SVG en /public/icons/
}

// Definición centralizada de canales
export const CHANNELS: readonly ChannelConfig[] = [
  {
    id: "overview",
    label: "Visión General",
    icon: "/icons/overview.svg",
  },
  {
    id: "web",
    label: "Web",
    icon: "/icons/web.svg",
  },
  {
    id: "email",
    label: "Email",
    icon: "/icons/email.svg",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "/icons/whatsapp.svg",
  },
  {
    id: "channelManager",
    label: "Channel Manager",
    icon: "/icons/channelManager.svg",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: "/icons/telegram.svg",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "/icons/instagram.svg",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: "/icons/facebook.svg",
  },
  {
    id: "x",
    label: "X (Twitter)",
    icon: "/icons/x.svg",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "/icons/tiktok.svg",
  },
  {
    id: "unknown",
    label: "Desconocido",
    icon: "/icons/unknown.svg",
  },
] as const;

// --- Mapa rápido para lookup por id (O(1))
export const CHANNELS_MAP: Record<ChannelId, ChannelConfig> = CHANNELS.reduce(
  (acc, ch) => {
    acc[ch.id] = ch;
    return acc;
  },
  {} as Record<ChannelId, ChannelConfig>
);

// --- Helper seguro para acceder a la config de un canal
export function getChannelConfig(id: ChannelId): ChannelConfig {
  return CHANNELS_MAP[id] || CHANNELS_MAP["unknown"];
}

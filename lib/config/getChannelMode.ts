// Path: /root/begasist/lib/config/getChannelMode.ts

import type { HotelConfig } from "@/types/channel";
import type { Channel, ChannelMode } from "@/types/channel";

/**
 * Devuelve el modo configurado para un canal ("automatic" | "supervised").
 * Si no está definido, devuelve "automatic" por defecto.
 */
export function getChannelMode(
  config: HotelConfig,
  channel: Channel
): ChannelMode {
  const chan = config.channelConfigs?.[channel];
  return chan?.mode ?? "automatic";
}

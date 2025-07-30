// Path: /root/begasist/lib/config/isChannelEnabled.ts

import type { HotelConfig } from "@/types/channel";

/**
 * Devuelve true si el canal está habilitado según la configuración del hotel.
 * 
 * @param config - Configuración completa del hotel
 * @param channel - Canal a verificar (ej: "email", "whatsapp", "channelManager")
 */
export function isChannelEnabled(config: HotelConfig, channel: string): boolean {
  const channelCfg = config.channelConfigs?.[channel as keyof typeof config.channelConfigs];
  return !!(channelCfg && channelCfg.enabled);
}

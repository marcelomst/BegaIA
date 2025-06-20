// Path: /root/begasist/utils/getChannelConfigs.ts

import type { HotelConfig, Channel, ChannelConfigMap } from "../types/channel";

/**
 * Extrae y normaliza el config de cada canal desde el HotelConfig.
 */
export function getChannelConfigs(hotelConfig: HotelConfig): Partial<ChannelConfigMap> {
  return hotelConfig.channelConfigs || {};
}

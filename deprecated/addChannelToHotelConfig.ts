// /lib/config/addChannelToHotelConfig.ts
import { getHotelConfig, updateHotelConfig } from "./hotelConfig.server";
import type { ChannelConfigMap } from "@/types/channel";

export async function addChannelToHotelConfig(
  hotelId: string,
  channel: string,
  config: ChannelConfigMap[keyof ChannelConfigMap] // 👈 más preciso que BaseChannelConfig
) {  
  const existing = await getHotelConfig(hotelId);

  const newConfig = {
    ...existing,
    channelConfigs: {
      ...existing?.channelConfigs,
      [channel]: config,
    },
  };

  return await updateHotelConfig(hotelId, newConfig);
}

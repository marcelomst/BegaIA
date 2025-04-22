// /lib/config/addChannelToHotelConfig.ts
import { getHotelConfig, updateHotelConfig } from "./hotelConfig";
import type { ChannelConfig } from "@/types/channel";

export async function addChannelToHotelConfig(hotelId: string, channel: string, config: ChannelConfig) {
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

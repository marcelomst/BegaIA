// /types/channel.ts


export type ChannelConfig = {
  enabled: boolean;
  mode: ChannelMode;
};

export type HotelConfig = {
  hotelId: string;
  channelConfigs: {
    [channel: string]: ChannelConfig;
  };
  lastUpdated?: string;
};
export type Channel = "web" | "email" | "whatsapp" | "channelManager";
export type ChannelStatus = "pending" | "sent" | "rejected";
export type ChannelMode = "supervised" | "automatic";

export interface ChannelMessage {
  id: string;
  channel: Channel;
  hotelId: string;
  sender: string;
  content: string;
  timestamp: string; // ISO
  time: string;      // legible
  suggestion: string;
  approvedResponse?: string;
  respondedBy?: string;
  status: ChannelStatus;
}


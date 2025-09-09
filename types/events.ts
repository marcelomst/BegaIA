// Path: /root/begasist/types/events.ts
import type { Channel } from "@/types/channel";

export type UniversalEvent = {
  hotelId: string;
  channel: Channel;
  conversationId: string;
  sourceMsgId?: string;
  content: string;
  from: "guest" | "assistant";
  timestamp: number | string;
  subject?: string;
  meta?: Record<string, any>;
};

// /types/message.ts

import type { Channel } from "@/types/channel";

export type MessageStatus = "pending" | "approved" | "rejected" | "sent";


export interface Message {
  id: string;
  hotelId: string;
  channel: Channel;
  sender: string;
  timestamp: string; // ISO string
  time?: string; // hora legible (opcional)
  content: string;
  suggestion?: string;
  approvedResponse?: string;
  respondedBy?: string;
  status: MessageStatus;
}

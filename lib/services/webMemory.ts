// /lib/services/webMemory.ts
import dotenv from "dotenv";
import type { Channel } from "@/types/channel";
dotenv.config();
const MAX_MESSAGES = process.env.MAX_MESSAGES || 100;
export type WebMessage = {
  id: string;
  sender: string;
  time: string;
  timestamp: string;
  content: string;
  suggestion: string;
  approvedResponse?: string;
  status?: "pending" | "approved" | "rejected" | "sent";
  edited?: boolean;
  respondedBy?: string; // 🆕 email del asistente o recepcionista
  channel: Channel;
};




// ⛑️ Aseguramos una única instancia viva durante dev (para mantener memoria compartida)
const globalKey = "__web_memory__";

if (!(globalThis as any)[globalKey]) {
  (globalThis as any)[globalKey] = {
    messages: [] as WebMessage[],
  };
}

const memory = (globalThis as any)[globalKey];

export const webMemory = {
  getMessages: (): WebMessage[] => {
    return memory.messages;
  },

  addMessage: (msg: WebMessage) => {
    memory.messages.push(msg);
    if (memory.messages.length > MAX_MESSAGES) {
      memory.messages = memory.messages.slice(-MAX_MESSAGES);
    }
  },

  updateMessage: (id: string, updates: Partial<WebMessage>): boolean => {
    const index = memory.messages.findIndex((m: WebMessage) => m.id === id);
    if (index !== -1) {
      memory.messages[index] = { ...memory.messages[index], ...updates };
      return true;
    }
    return false;
  },

  clearMessages: () => {
    memory.messages = [];
  },
};

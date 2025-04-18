// /lib/services/webMemory.ts

// /lib/services/webMemory.ts

export type WebMessage = {
  id: string;
  sender: string;
  time: string; // hora legible tipo "10:45"
  timestamp: string; // nueva propiedad para ordenación ISO
  content: string;
  suggestion: string;
  approvedResponse?: string;
  status?: "pending" | "approved" | "rejected" | "sent";
  edited?: boolean;
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

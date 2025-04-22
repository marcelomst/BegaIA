// /lib/services/whatsappMemory.ts

type Message = {
    id: string;
    sender: string;
    timestamp: string;
    content: string;
    suggestion: string;
    approvedResponse?: string;
    status: "pending" | "sent" | "rejected";
    edited?: boolean;
    respondedBy?: string;
  };
  
  const memory: Message[] = [
    {
      id: "whatsapp-msg-1",
      sender: "+5491123456789",
      timestamp: new Date().toISOString(),
      content: "¿Tienen desayuno incluido?",
      suggestion: "Sí, el desayuno está incluido en todas las tarifas.",
      status: "pending",
    },
  ];
  
  export const whatsappMemory = {
    getMessages: () => memory,
    updateMessage: (id: string, changes: Partial<Message>) => {
      const msg = memory.find((m) => m.id === id);
      if (!msg) return false;
      Object.assign(msg, changes);
      return true;
    },
  };
  
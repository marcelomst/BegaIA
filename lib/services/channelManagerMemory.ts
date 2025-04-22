// /lib/services/channelManagerMemory.ts

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
      id: "cm-msg-1",
      sender: "Booking.com",
      timestamp: new Date().toISOString(),
      content: "¿La habitación doble incluye estacionamiento?",
      suggestion: "Sí, incluye estacionamiento gratuito para 1 vehículo.",
      status: "pending",
    },
  ];
  
  export const channelManagerMemory = {
    getMessages: () => memory,
    updateMessage: (id: string, changes: Partial<Message>) => {
      const msg = memory.find((m) => m.id === id);
      if (!msg) return false;
      Object.assign(msg, changes);
      return true;
    },
  };
  
// /lib/services/emailMemory.ts

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
      id: "email-msg-1",
      sender: "cliente@correo.com",
      timestamp: new Date().toISOString(),
      content: "¿Puedo hacer check-in a las 10am?",
      suggestion: "Claro, el check-in temprano está sujeto a disponibilidad.",
      status: "pending",
    },
  ];
  
  export const emailMemory = {
    getMessages: () => memory,
    updateMessage: (id: string, changes: Partial<Message>) => {
      const msg = memory.find((m) => m.id === id);
      if (!msg) return false;
      Object.assign(msg, changes);
      return true;
    },
  };
  
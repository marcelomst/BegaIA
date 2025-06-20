// Path: /root/begasist/utils/fetchAndMapMessagesWithSubject.ts

import type { ChatTurnWithMeta } from "@/types/channel";

/**
 * Recupera los mensajes de una conversación de un canal y los mapea a ChatTurnWithMeta,
 * incluyendo approvedResponse, suggestion, status, respondedBy y otros campos útiles
 * para manejo completo en el panel admin.
 */
export async function fetchAndMapMessagesWithSubject(
  channelId: string,
  conversationId: string,
  hotelId: string
): Promise<{ messages: ChatTurnWithMeta[]; subject?: string }> {
  const res = await fetch(
    `/api/messages/by-conversation?channelId=${encodeURIComponent(channelId)}&conversationId=${encodeURIComponent(conversationId)}&hotelId=${encodeURIComponent(hotelId)}`
  );
  const data = await res.json();
  if (!Array.isArray(data.messages)) return { messages: [], subject: data.subject };

  const mensajesOrdenados = [...data.messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const messages: ChatTurnWithMeta[] = mensajesOrdenados.map((msg: any) => ({
    role: msg.sender === "assistant" ? "ai" : "user",
    text:
      msg.sender === "assistant"
        // Si el mensaje fue aprobado, mostramos ese; si no, el sugerido; fallback: ""
        ? msg.approvedResponse ?? msg.suggestion ?? ""
        : msg.content ?? "",
    timestamp: msg.timestamp,
    status: msg.status ?? undefined,
    respondedBy: msg.respondedBy ?? undefined,
    approvedResponse: msg.approvedResponse ?? undefined,
    suggestion: msg.suggestion ?? undefined,  // Para "Ver original"
    messageId: msg.messageId,                 // Por si se necesita editar/enviar
  }));

  return { messages, subject: data.subject };
}

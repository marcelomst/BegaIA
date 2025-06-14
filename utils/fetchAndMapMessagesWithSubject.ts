// Path: /root/begasist/utils/fetchAndMapMessagesWithSubject.ts

import type { ChatTurn } from "@/types/channel";

/**
 * Recupera los mensajes de una conversación de un canal y los mapea a ChatTurn.
 * También retorna el subject de la conversación si está disponible.
 */
export async function fetchAndMapMessagesWithSubject(
  channelId: string,
  conversationId: string,
  hotelId: string
): Promise<{ messages: ChatTurn[]; subject?: string }> {
  const res = await fetch(
    `/api/messages/by-conversation?channelId=${encodeURIComponent(channelId)}&conversationId=${encodeURIComponent(conversationId)}&hotelId=${encodeURIComponent(hotelId)}`
  );
  const data = await res.json();
  if (!Array.isArray(data.messages)) return { messages: [], subject: data.subject };

  const mensajesOrdenados = [...data.messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const messages: ChatTurn[] = mensajesOrdenados.map((msg: any) => ({
    role: msg.sender === "assistant" ? "ai" : "user",
    text:
      msg.sender === "assistant"
        ? msg.approvedResponse ?? msg.suggestion ?? ""
        : msg.content ?? "",
    timestamp: msg.timestamp,
  }));

  return { messages, subject: data.subject };
}

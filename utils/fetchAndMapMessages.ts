// Path: /root/begasist/utils/fetchAndMapMessages.ts
import type { ChatTurn } from "../types/channel";

/**
 * Recupera y mapea los mensajes de una conversación de cualquier canal.
 * @param channelId - ID lógico del canal (web, whatsapp, email, etc)
 * @param conversationId - ID de la conversación
 * @param hotelId - ID del hotel
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
  const messages: ChatTurn[] = mensajesOrdenados.map((msg: any) =>
    msg.sender === "assistant"
      ? { role: "ai", text: msg.approvedResponse ?? msg.suggestion ?? "", timestamp: msg.timestamp }
      : { role: "user", text: msg.content ?? "", timestamp: msg.timestamp }
  );
  return { messages, subject: data.subject };
}

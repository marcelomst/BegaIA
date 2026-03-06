// Path: /root/begasist/utils/fetchAndOrderConversations.ts

import type { ConversationSummary } from "@/types/channel";

/**
 * Trae la lista de conversaciones de un guestId para un hotel y canal,
 * ordenada por lastUpdatedAt descendente.
 */
export async function fetchConversationsByChannelAndGuest(
  hotelId: string,
  guestId: string,
  channel: string
  
): Promise<ConversationSummary[]> {
  const url = `/api/admin/conversations?hotelId=${hotelId}&channel=${channel}&guestId=${guestId}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.conversations ?? []).slice().sort(
    (a: ConversationSummary, b: ConversationSummary) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );
}
export async function fetchAllConversationsByChannel(
  hotelId: string,
  channel: string
): Promise<ConversationSummary[]> {
  const _channel = channel; // se mantiene firma por compatibilidad con llamados existentes
  const url = `/api/admin/conversations?hotelId=${hotelId}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(" 🎆fetchAllConversationsByChannel", data);
  return (data.conversations ?? []).slice().sort(
    (a: ConversationSummary, b: ConversationSummary) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );
}

export async function fetchConversationsByChannelAndUser(
  hotelId: string,
  channel: string,
  userId: string
): Promise<ConversationSummary[]> {
  const url = `/api/conversations/list?hotelId=${hotelId}&channel=${channel}&userId=${userId}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.conversations ?? []).slice().sort(
    (a: ConversationSummary, b: ConversationSummary) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );
}

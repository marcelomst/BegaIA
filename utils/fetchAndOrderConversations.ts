// Path: /root/begasist/utils/fetchAndOrderConversations.ts

import type { ConversationSummary } from "@/types/channel";

/**
 * Trae la lista de conversaciones de un guestId para un hotel y canal,
 * ordenada por lastUpdatedAt descendente.
 */
export async function fetchAndOrderConversationsByChannel(
  hotelId: string,
  guestId: string,
  channel: string = "web"
): Promise<ConversationSummary[]> {
  const res = await fetch(
    `/api/conversations/list?hotelId=${hotelId}&guestId=${guestId}&channel=${channel}`
  );
  const data = await res.json();
  return (data.conversations ?? []).slice().sort(
    (a: ConversationSummary, b: ConversationSummary) =>
      new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );
}

// Path: /root/begasist/lib/web/eventBus.ts
import type { RichPayload } from "@/types/richPayload";

type EventPayload =
  | { type: "message"; sender: "user" | "assistant"; text: string; timestamp: string; rich?: RichPayload }
  | { type: "status"; value: "open" | "pending" | "closed"; timestamp: string }
  | { type: string;[k: string]: any };

const listeners = new Map<string, Set<(ev: EventPayload) => void>>();

export function onConversation(
  conversationId: string,
  listener: (ev: EventPayload) => void
): () => void {
  const set = listeners.get(conversationId) ?? new Set();
  set.add(listener);
  listeners.set(conversationId, set);
  return () => {
    const s = listeners.get(conversationId);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) listeners.delete(conversationId);
  };
}

export function emitToConversation(conversationId: string, ev: EventPayload) {
  const set = listeners.get(conversationId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(ev);
    } catch { }
  }
}

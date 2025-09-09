// Path: /root/begasist/test/mocks/db_conversations.ts
import type { Conversation, Channel } from "@/types/channel";
import { getCollection } from "./astra";

const col = () => getCollection("conversations");

/**
 * Crea una conversación nueva.
 */
export async function createConversation(opts: {
  hotelId: string;
  channel: Channel;
  lang: string;
  userId?: string;
  guestId?: string;
  metadata?: Record<string, any>;
  status?: "active" | "closed" | "archived";
}): Promise<Conversation> {
  const conversationId = `conv-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const doc: any = {
    conversationId,
    hotelId: opts.hotelId,
    channel: opts.channel,
    lang: opts.lang,
    userId: opts.userId,
    guestId: opts.guestId,
    status: opts.status ?? "active",
    createdAt: now,
    lastUpdatedAt: now,
    metadata: opts.metadata ?? {},
  };
  await col().insertOne(doc);
  return doc as Conversation;
}

/**
 * Mock que pide tu messageHandler: si existe, devuelve; si no, crea.
 */
export async function getOrCreateConversation(input: {
  conversationId: string;
  hotelId: string;
  channel: Channel;
  lang?: string;
  userId?: string;
  guestId?: string;
  status?: "active" | "closed" | "archived";
  metadata?: Record<string, any>;
}): Promise<Conversation> {
  const existing = await col().findOne({ conversationId: input.conversationId });
  if (existing) return existing as Conversation;

  const now = new Date().toISOString();
  const doc: any = {
    conversationId: input.conversationId,
    hotelId: input.hotelId,
    channel: input.channel,
    lang: input.lang ?? "es",
    userId: input.userId,
    guestId: input.guestId,
    status: input.status ?? "active",
    createdAt: now,
    lastUpdatedAt: now,
    metadata: input.metadata ?? {},
  };
  await col().insertOne(doc);
  return doc as Conversation;
}

/**
 * Actualiza campos de la conversación.
 */
export async function updateConversation(conversationId: string, changes: Partial<Conversation>) {
  const existing = (await col().findMany({ conversationId }))[0];
  if (!existing) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  const updated = { ...existing, ...changes, lastUpdatedAt: new Date().toISOString() };
  await col().updateOne({ _id: existing._id }, updated as any);
  return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
}

// Utilidades opcionales por si algún código las usa
export async function getConversation(conversationId: string) {
  return (await col().findOne({ conversationId })) as Conversation | null;
}
export async function listConversations(hotelId: string, channel?: Channel) {
  return (await col().findMany(
    channel ? { hotelId, channel } : { hotelId }
  )) as Conversation[];
}

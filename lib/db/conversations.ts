// /lib/db/conversations.ts
import { v4 as uuidv4 } from "uuid";
import type { Conversation, Channel } from "@/types/channel";
import { getAstraDB } from "@/lib/astra/connection"; // 👈 tu helper centralizado

const CONVERSATIONS_COLLECTION = "conversations";

function getConversationsCollection() {
  return getAstraDB().collection<Conversation>(CONVERSATIONS_COLLECTION);
}

interface CreateConversationOptions {
  hotelId: string;
  channel: Channel;
  lang: string;
  userId?: string;   // si es usuario autenticado
  guestId?: string;  // si es guest anónimo (guardalo en cookie)
  metadata?: Record<string, any>;
  status?: "active" | "closed" | "archived";
}

/**
 * Crea una conversación nueva y la guarda en AstraDB.
 */
export async function createConversation(opts: CreateConversationOptions): Promise<Conversation> {
  const now = new Date().toISOString();
  const conversation: Conversation = {
    conversationId: uuidv4(),
    hotelId: opts.hotelId,
    channel: opts.channel,
    startedAt: now,
    lastUpdatedAt: now,
    lang: opts.lang,
    userId: opts.userId,
    guestId: opts.guestId,
    status: opts.status ?? "active",
    metadata: opts.metadata ?? {},
  };

  const collection = getConversationsCollection();
  await collection.insertOne(conversation);
  console.log("✅ Conversación creada:", conversation.conversationId);
  return conversation;
}

/**
 * Recupera una conversación por ID.
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  const collection = getConversationsCollection();
  return await collection.findOne({ conversationId });
}

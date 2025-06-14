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
  conversationId?: string; // ← AGREGALO
  subject?: string;        // ← AGREGALO
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
    subject: opts.subject ?? "", // ← AGREGALO
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
  console.log("🔍 Buscando conversación por ID:", conversationId);
  const collection = getConversationsCollection();
  return await collection.findOne({ conversationId });
}


export async function getAllConversationsForHotel(hotelId: string) {
  const collection = getConversationsCollection();
  return await collection.find({ hotelId }, { sort: { lastUpdatedAt: -1 }, limit: 100 }).toArray();
}

export async function getConversationsByUser(
  hotelId: string,
  id: string // puede ser userId o guestId
): Promise<Conversation[]> {
  const collection = getConversationsCollection();
  const c1 = await collection.find({ hotelId, userId: id }).toArray();
  const c2 = await collection.find({ hotelId, guestId: id }).toArray();
  const merged = [...c1, ...c2];
  const unique = Array.from(new Map(merged.map(c => [c.conversationId, c])).values());
  return unique;
}

/**
 * Actualiza una conversación existente.
 */
// Path: /root/begasist/lib/db/conversations.ts

export async function updateConversation(
  conversationId: string,
  changes: Partial<Conversation>
) {
  const collection = getConversationsCollection();
  await collection.updateOne(
    { conversationId },
    { $set: changes }
  );
}

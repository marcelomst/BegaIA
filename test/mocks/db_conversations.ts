// Path: /root/begasist/test/mocks/db_conversations.ts
import type { Conversation, Channel } from "@/types/channel";
import { getCollection } from "./astra";
import { normalizeGuestAlias } from "@/lib/db/guestAliases";

const col = () => getCollection("conversations");

function normalizeConversationGuestLookupKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.includes(":")) return normalizeGuestAlias(raw);
  if (raw.includes("@")) return raw.toLowerCase();
  return raw;
}

function addLookupVariants(target: Set<string>, rawValue: unknown) {
  const normalized = normalizeConversationGuestLookupKey(rawValue);
  if (!normalized) return;
  target.add(normalized);

  const lower = normalized.toLowerCase();
  if (lower.startsWith("whatsapp:")) {
    const withoutPrefix = normalized.slice("whatsapp:".length).trim();
    if (withoutPrefix) target.add(withoutPrefix);
    return;
  }

  if (lower.startsWith("email:")) {
    const withoutPrefix = normalized.slice("email:".length).trim().toLowerCase();
    if (withoutPrefix) target.add(withoutPrefix);
    return;
  }

  if (lower.startsWith("web:")) {
    const withoutPrefix = normalized.slice("web:".length).trim();
    if (withoutPrefix) target.add(withoutPrefix);
    return;
  }

  if (!normalized.includes(":")) {
    if (normalized.includes("@")) {
      target.add(`email:${normalized.toLowerCase()}`);
      return;
    }

    target.add(`whatsapp:${normalized}`);
    target.add(`web:${normalized}`);
  }
}

export function buildConversationGuestLookupKeys(input: {
  guestId: string;
  aliases?: string[];
}): string[] {
  const keys = new Set<string>();
  addLookupVariants(keys, input.guestId);
  (Array.isArray(input.aliases) ? input.aliases : []).forEach((alias) => addLookupVariants(keys, alias));
  return Array.from(keys);
}

export function filterConversationsForGuestPerspective(
  conversations: Conversation[],
  input: {
    guestId: string;
    aliases?: string[];
  },
): Conversation[] {
  const lookup = new Set(buildConversationGuestLookupKeys(input));
  if (lookup.size === 0) return [];

  return conversations.filter((conv) => {
    const key = normalizeConversationGuestLookupKey(conv.guestId);
    return key ? lookup.has(key) : false;
  });
}

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

export async function appendConversationReplyTrace(_input: any) {
  return { acknowledged: true };
}

// Utilidades opcionales por si algún código las usa
export async function getConversation(conversationId: string) {
  return (await col().findOne({ conversationId })) as Conversation | null;
}

export async function getConversationById(conversationId: string) {
  return getConversation(conversationId);
}

export async function getAllConversationsForHotel(hotelId: string): Promise<Conversation[]> {
  const all = (await col().findMany({ hotelId })) as Conversation[];
  return [...all].sort((a, b) => {
    const aTs = Date.parse(a.lastUpdatedAt || a.startedAt || "");
    const bTs = Date.parse(b.lastUpdatedAt || b.startedAt || "");
    return bTs - aTs;
  });
}

export async function listConversations(hotelId: string, channel?: Channel) {
  return (await col().findMany(
    channel ? { hotelId, channel } : { hotelId }
  )) as Conversation[];
}

export async function getConversationsByHotelAndChannel(
  hotelId: string,
  channel: Channel,
): Promise<Conversation[]> {
  return listConversations(hotelId, channel);
}

export async function getConversationsByGuestId(input: {
  hotelId: string;
  guestId: string;
}): Promise<Conversation[]> {
  const hotelId = String(input.hotelId ?? "").trim();
  const guestId = String(input.guestId ?? "").trim();
  if (!hotelId || !guestId) return [];
  const all = (await col().findMany({ hotelId, guestId })) as Conversation[];
  return [...all].sort((a, b) => {
    const aTs = Date.parse(a.lastUpdatedAt || a.startedAt || "");
    const bTs = Date.parse(b.lastUpdatedAt || b.startedAt || "");
    return bTs - aTs;
  });
}

export async function getConversationsForGuestPerspective(input: {
  hotelId: string;
  guestId: string;
  aliases?: string[];
}): Promise<Conversation[]> {
  const hotelId = String(input.hotelId ?? "").trim();
  const guestId = String(input.guestId ?? "").trim();
  if (!hotelId || !guestId) return [];

  const all = (await getAllConversationsForHotel(hotelId)) as Conversation[];
  return filterConversationsForGuestPerspective(all, {
    guestId,
    aliases: input.aliases,
  });
}

export async function getConversationsByUser(hotelId: string, id: string): Promise<Conversation[]> {
  const byGuest = (await col().findMany({ hotelId, guestId: id })) as Conversation[];
  const byUser = (await col().findMany({ hotelId, userId: id })) as Conversation[];
  const merged = [...byGuest, ...byUser];
  const unique = Array.from(new Map(merged.map((c) => [c.conversationId, c])).values());
  return unique;
}

export async function findActiveConversationByGuestId(input: {
  hotelId: string;
  guestId: string;
  channel?: Channel;
}): Promise<Conversation | null> {
  const hotelId = String(input.hotelId ?? "").trim();
  const guestId = String(input.guestId ?? "").trim();
  if (!hotelId || !guestId) return null;
  const channel = typeof input.channel === "string" ? input.channel.trim() : "";

  const query = channel ? { hotelId, guestId, channel } : { hotelId, guestId };
  const candidates = (await col().findMany(query)) as Conversation[];
  const sorted = [...candidates].sort((a, b) => {
    const aTs = Date.parse(a.lastUpdatedAt || a.startedAt || "");
    const bTs = Date.parse(b.lastUpdatedAt || b.startedAt || "");
    return bTs - aTs;
  });

  return sorted.find((c) => (c.status ?? "active") === "active") ?? null;
}

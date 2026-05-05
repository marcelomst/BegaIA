// /lib/db/conversations.ts
import { v4 as uuidv4 } from "uuid";
import type { Conversation, Channel } from "@/types/channel";
import { getAstraDB } from "@/lib/astra/connection"; // 👈 tu helper centralizado
import { normalizeGuestAlias } from "@/lib/db/guestAliases";

const CONVERSATIONS_COLLECTION = "conversations";

function getConversationsCollection() {
  return getAstraDB().collection<Conversation>(CONVERSATIONS_COLLECTION);
}

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
  console.log("🔍 Buscando conversaciones para hotel:", hotelId, "y usuario/guest ID:", id);
  const collection = getConversationsCollection();
  const c1 = await collection.find({ hotelId, userId: id }).toArray();
  const c2 = await collection.find({ hotelId, guestId: id }).toArray();
  const merged = [...c1, ...c2];
  const unique = Array.from(new Map(merged.map(c => [c.conversationId, c])).values());
  return unique;
}

export async function getConversationsByGuestId(input: {
  hotelId: string;
  guestId: string;
}): Promise<Conversation[]> {
  const hotelId = String(input.hotelId ?? "").trim();
  const guestId = String(input.guestId ?? "").trim();
  if (!hotelId || !guestId) return [];

  const collection = getConversationsCollection();
  return await collection
    .find({ hotelId, guestId }, { sort: { lastUpdatedAt: -1 }, limit: 200 })
    .toArray();
}

export async function getConversationsForGuestPerspective(input: {
  hotelId: string;
  guestId: string;
  aliases?: string[];
}): Promise<Conversation[]> {
  const hotelId = String(input.hotelId ?? "").trim();
  const guestId = String(input.guestId ?? "").trim();
  if (!hotelId || !guestId) return [];

  const allConversations = await getAllConversationsForHotel(hotelId);
  return filterConversationsForGuestPerspective(allConversations, {
    guestId,
    aliases: input.aliases,
  });
}

/**
 * Busca la conversación activa más reciente para un huésped.
 * Se usa para unificar mensajes cross-canal por identidad canónica (guestId).
 */
export async function findActiveConversationByGuestId(input: {
  hotelId: string;
  guestId: string;
}): Promise<Conversation | null> {
  const hotelId = String(input.hotelId ?? "").trim();
  const guestId = String(input.guestId ?? "").trim();
  if (!hotelId || !guestId) return null;

  const collection = getConversationsCollection();
  const candidates = await collection
    .find({ hotelId, guestId }, { sort: { lastUpdatedAt: -1 }, limit: 20 })
    .toArray();

  return (
    candidates.find((c) => (c.status ?? "active") === "active") ??
    null
  );
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

export type ConversationReplyTrace = {
  messageId: string;
  timestamp: string;
  category?: string | null;
  promptKey?: string | null;
  contentVersion?: string | null;
  source?: string | null;
};

/**
 * Deja una huella mínima de la última respuesta AI de la conversación
 * (útil para auditoría de categoría/prompt/version).
 */
export async function stampConversationReplyTrace(
  conversationId: string,
  trace: ConversationReplyTrace
) {
  const collection = getConversationsCollection();
  await collection.updateOne(
    { conversationId },
    {
      $set: {
        lastUpdatedAt: trace.timestamp,
        "metadata.lastResponseTrace": trace,
      } as any,
    }
  );
}

/**
 * Agrega huella al historial y actualiza "lastResponseTrace".
 * Mantiene sólo las últimas N huellas para evitar crecimiento infinito.
 */
export async function appendConversationReplyTrace(
  conversationId: string,
  trace: ConversationReplyTrace,
  maxItems = 200
) {
  const collection = getConversationsCollection();
  await collection.updateOne(
    { conversationId },
    {
      $set: {
        lastUpdatedAt: trace.timestamp,
        "metadata.lastResponseTrace": trace,
      } as any,
      $push: {
        "metadata.responseTraceHistory": {
          $each: [trace],
          $slice: -Math.max(1, maxItems),
        },
      } as any,
    }
  );
}

/**
 * Trae todas las conversaciones de un hotel+canal (sin importar guestId/userId)
 */
export async function getConversationsByHotelAndChannel(
  hotelId: string,
  channel: Channel // <-- use the Channel type instead of string
): Promise<Conversation[]> {
  const collection = getConversationsCollection();
  // Devuelve las más recientes primero, límite 200 (ajustá a gusto)
  return await collection
    .find({ hotelId, channel }, { sort: { lastUpdatedAt: -1 }, limit: 200 })
    .toArray();
}



/**
 * Obtiene o crea una conversación de WhatsApp para un hotel+sender.
 */
export async function getOrCreateConversation({
  conversationId,
  hotelId,
  channel,
  guestId,
  startedAt,
  lastUpdatedAt,
  lang = "es",
  status = "active",
  subject = "",
}: {
  conversationId: string;
  hotelId: string;
  channel: Channel;
  guestId: string;
  startedAt: string;
  lastUpdatedAt: string;
  lang?: string;
  status?: "active" | "closed" | "archived";
  subject?: string;
}) {
  const collection = getConversationsCollection();
  const existing = await collection.findOne({ conversationId });
  if (existing) return existing;
  const conversation: Conversation = {
    conversationId,
    hotelId,
    channel,
    guestId,
    startedAt,
    lastUpdatedAt,
    lang,
    status,
    subject,
  };
  await collection.insertOne(conversation);
  return conversation;
}

// Path: /root/begasist/lib/db/messages.ts
import { getAstraDB } from "@/lib/astra/connection";
import type { Channel, ChannelMessage } from "@/types/channel";

/** ===== Tipos ===== */
export type MessageStatus =
  | "pending"
  | "sent"
  | "approved"
  | "rejected"
  | "delivered"
  | "failed"
  | "ignored"
  | "expired";

export type MessageDoc = {
  _id?: string;               // = messageId como PK
  messageId: string;
  hotelId: string;
  channel: Channel;
  sender?: string;
  role?: "user" | "ai" | "system";
  direction?: "in" | "out";
  content?: string;
  suggestion?: string;
  approvedResponse?: string;
  respondedBy?: string;
  timestamp?: string;         // ISO
  time?: string;              // HH:mm opcional
  status?: MessageStatus;
  guestId?: string;
  conversationId?: string | null;
  originalMessageId?: string;
  subject?: string;
  meta?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  // Tracking de entrega
  deliveredAt?: string;
  deliveryError?: string;
  deliveryAttempts?: number;
  // Idempotencia cross-canal (web/email/whatsapp)
  sourceMsgId?: string;
};

// helper para derivar dirección si no viene
function deriveDirection(msg: ChannelMessage): "in" | "out" {
  if ((msg as any).direction) return (msg as any).direction;
  return (msg.role === "user" || msg.sender === "guest") ? "in" : "out";
}

const COLLECTION = "messages";
function col() {
  return getAstraDB().collection<MessageDoc>(COLLECTION);
}

/** ===== Helpers ===== */
function nowISO() {
  return new Date().toISOString();
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** 👇 Mapea un ChannelMessage → MessageDoc (no perdemos guestId / conversationId) */
export function toDoc(msg: ChannelMessage): MessageDoc {
  const ts =
    typeof msg.timestamp === "string" && msg.timestamp
      ? msg.timestamp
      : nowISO();

  return {
    _id: msg.messageId,               // usamos messageId como PK
    messageId: msg.messageId,
    hotelId: msg.hotelId,
    channel: msg.channel,
    sender: msg.sender,
    role: msg.role,
    direction: deriveDirection(msg),
    content: asString(msg.content),
    suggestion: asString((msg as any).suggestion),
    approvedResponse: (msg as any).approvedResponse,
    respondedBy: (msg as any).respondedBy,
    timestamp: ts,
    time: (msg as any).time,
    status: (msg as any).status,

    // Contexto de hilo/huésped
    guestId: (msg as any).guestId,
    conversationId: msg.conversationId ?? null,

    // Email / metadata
    originalMessageId: (msg as any).originalMessageId,
    subject: (msg as any).subject,
    meta: (msg as any).meta,

    // Tracking de entrega
    deliveredAt: (msg as any).deliveredAt,
    deliveryError: (msg as any).deliveryError,
    deliveryAttempts: (msg as any).deliveryAttempts,

    // Idempotencia cross-canal
    sourceMsgId: (msg as any).sourceMsgId,

    createdAt: (msg as any).createdAt,
    updatedAt: (msg as any).updatedAt,
  };
}

/** Guardar (upsert) un MessageDoc “puro” */
export async function saveMessageToAstra(doc: MessageDoc): Promise<void> {
  const id = doc.messageId;
  if (!id) throw new Error("saveMessageToAstra: messageId requerido");

  const now = nowISO();

  // Campos base
  const base: MessageDoc = {
    ...doc,
    _id: id,
  };

  // Para $set: nunca actualizar _id, messageId ni createdAt
  const toSet: Partial<MessageDoc> = {
    ...base,
    updatedAt: now,
  };
  delete (toSet as any)._id;
  delete (toSet as any).messageId;
  delete (toSet as any).createdAt;

  // Para $setOnInsert: se fija _id, messageId y createdAt sólo cuando se inserta
  const toSetOnInsert: Partial<MessageDoc> = {
    _id: id,
    messageId: id,
    createdAt: doc.createdAt ?? now,
  };

  await col().updateOne({ _id: id }, { $set: toSet, $setOnInsert: toSetOnInsert }, { upsert: true });
}

/** ✅ Guardar (upsert) partiendo de ChannelMessage */
export async function saveChannelMessageToAstra(msg: ChannelMessage): Promise<void> {
  const doc = toDoc(msg);
  return saveMessageToAstra(doc);
}

/** Actualiza campos de un mensaje ya guardado */
export async function updateMessageInAstra(
  hotelId: string,
  messageId: string,
  changes: Partial<MessageDoc>
) {
  const _id = messageId;
  const toSet: Partial<MessageDoc> = { ...changes, updatedAt: nowISO() };
  // Sanitizar: nunca permitir mover PK ni createdAt
  delete (toSet as any)._id;
  delete (toSet as any).messageId;
  delete (toSet as any).createdAt;

  await col().updateOne({ _id, hotelId }, { $set: toSet });
}

/** Obtiene mensajes por canal (más recientes primero). `limit` es opcional. */
export async function getMessages(
  hotelId: string,
  channel: Channel,
  limit?: number
): Promise<MessageDoc[]> {
  const query: Partial<MessageDoc> = { hotelId, channel };
  // @ts-ignore Astra cursor options
  const cursor = await col().find(query, {
    sort: { timestamp: -1, createdAt: -1 },
    limit: typeof limit === "number" ? limit : undefined,
  });
  const result = Array.isArray(cursor) ? cursor : await (cursor?.toArray?.() ?? []);
  return result;
}

/** Obtiene mensajes por conversación (opcionalmente filtra canal). */
export async function getMessagesByConversation(args: {
  hotelId: string;
  conversationId: string;
  channel?: Channel;
  limit?: number;
}): Promise<MessageDoc[]> {
  const { hotelId, conversationId, channel, limit } = args;
  const query: Partial<MessageDoc> = { hotelId, conversationId };
  if (channel) (query as any).channel = channel;

  // @ts-ignore
  const cursor = await col().find(query, {
    sort: { timestamp: -1, createdAt: -1 },
    limit: typeof limit === "number" ? limit : undefined,
  });
  const result = Array.isArray(cursor) ? cursor : await (cursor?.toArray?.() ?? []);
  return result;
}

/** Idempotencia por originalMessageId (MessageDoc “puro”) */
export async function saveMessageIdempotent(
  msg: MessageDoc,
  opts?: { idempotencyKey?: string }
) {
  if (!msg.originalMessageId) {
    await saveMessageToAstra(msg);
    return { ok: true, id: msg.messageId };
  }
  const already = await getMessageByOriginalId(msg.originalMessageId);
  if (already) return { ok: true, id: already._id || already.messageId };
  await saveMessageToAstra(msg);
  return { ok: true, id: msg.messageId };
}

/** ✅ Idempotencia partiendo de ChannelMessage */
export async function saveChannelMessageIdempotent(
  msg: ChannelMessage,
  opts?: { idempotencyKey?: string }
) {
  const doc = toDoc(msg);
  return saveMessageIdempotent(doc, opts);
}

/** Idempotencia para email: busca por originalMessageId (no scope por hotel) */
export async function getMessageByOriginalId(
  originalMessageId: string
): Promise<MessageDoc | null> {
  if (!originalMessageId) return null;
  const doc = await col().findOne({ originalMessageId });
  return (doc as MessageDoc) ?? null;
}

/** 🆕 Versión “scoped” por hotel (mejor para multi-hotel) */
export async function getMessageByOriginalIdScoped(
  hotelId: string,
  originalMessageId: string
): Promise<MessageDoc | null> {
  if (!hotelId || !originalMessageId) return null;
  const doc = await col().findOne({ hotelId, originalMessageId });
  return (doc as MessageDoc) ?? null;
}

/** 🆕 Búsqueda por sourceMsgId + scope (debug/metricas) */
export async function getMessageBySourceId(
  hotelId: string,
  conversationId: string,
  sourceMsgId: string
): Promise<MessageDoc | null> {
  if (!hotelId || !conversationId || !sourceMsgId) return null;
  const doc = await col().findOne({ hotelId, conversationId, sourceMsgId });
  return (doc as MessageDoc) ?? null;
}

/** Lectura simple por messageId */
export async function getMessageById(messageId: string): Promise<MessageDoc | null> {
  if (!messageId) return null;
  const _id = messageId;
  const doc = await col().findOne({ _id });
  return (doc as MessageDoc) ?? null;
}

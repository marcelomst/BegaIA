// Path: /root/begasist/test/mocks/db_messages.ts
import { getCollection } from "./astra";

function nowISO() {
  return new Date().toISOString();
}

export async function saveChannelMessageToAstra(msg: any): Promise<void> {
  const col = getCollection("messages");
  const id = msg.messageId || `m-${Math.random().toString(36).slice(2)}`;
  const base = {
    ...msg,
    _id: id,
    messageId: id,
    createdAt: msg.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };

  // upsert manual: findOne → updateOne | insertOne
  const existing = (await col.findOne?.({ _id: id })) ?? null;
  if (existing) {
    if (typeof col.updateOne === "function") {
      await col.updateOne({ _id: id }, { $set: base }); // ✅ solo 2 args
    } else {
      // fallback: reemplazo simple
      await col.insertOne?.(base);
    }
  } else {
    await col.insertOne?.(base);
  }
}

export const saveMessageToAstra = saveChannelMessageToAstra;

export async function updateMessageInAstra(
  hotelId: string,
  messageId: string,
  changes: any
) {
  const col = getCollection("messages");
  const $set = { ...changes, updatedAt: nowISO() };
  if (typeof col.updateOne === "function") {
    await col.updateOne({ _id: messageId, hotelId }, { $set }); // ✅ solo 2 args
  }
}

export async function getMessagesByConversation(args: {
  hotelId: string;
  conversationId: string;
  channel?: string;
  limit?: number;
}) {
  const col = getCollection("messages");
  const { hotelId, conversationId, channel, limit } = args;

  const all = (await col.findMany?.({ hotelId, conversationId })) || [];
  const filtered = channel ? all.filter((m: any) => m.channel === channel) : all;

  filtered.sort((a: any, b: any) => {
    const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
    const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
    return ta - tb; // ASC
  });

  return typeof limit === "number" ? filtered.slice(-limit) : filtered;
}

export async function getMessages(hotelId: string, channel: string, limit?: number) {
  const col = getCollection("messages");
  const all = (await col.findMany?.({ hotelId, channel })) || [];
  all.sort((a: any, b: any) => {
    const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
    const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
    return ta - tb;
  });
  return typeof limit === "number" ? all.slice(-limit) : all;
}

export async function getMessageByOriginalId(originalMessageId: string) {
  if (!originalMessageId) return null;
  const col = getCollection("messages");
  return (await col.findOne?.({ originalMessageId })) ?? null;
}

export async function getMessageById(messageId: string) {
  if (!messageId) return null;
  const col = getCollection("messages");
  return (await col.findOne?.({ _id: messageId })) ?? null;
}

export async function saveMessageIdempotent(
  doc: any,
  _opts?: { idempotencyKey?: string }
) {
  if (doc?.originalMessageId) {
    const exists = await getMessageByOriginalId(doc.originalMessageId);
    if (exists) return { ok: true, id: exists.messageId, deduped: true };
  }
  await saveChannelMessageToAstra(doc);
  return { ok: true, id: doc.messageId, deduped: false };
}

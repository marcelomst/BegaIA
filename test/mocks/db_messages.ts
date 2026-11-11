// Path: /root/begasist/test/mocks/db_messages.ts
import { getCollection } from "./astra";

function nowISO() {
  return new Date().toISOString();
}

const immutableMaterialFields = [
  "hotelId", "conversationId", "channel", "direction", "content",
  "originalMessageId", "sourceMsgId", "sender", "guestId", "role",
  "subject", "timestamp", "time", "suggestion", "rich",
] as const;

function equivalent(left: any, right: any) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasCompatibleMaterial(existing: any, desired: any) {
  return immutableMaterialFields.every((field) =>
    desired[field] === undefined || equivalent(existing[field], desired[field])
  );
}

export async function saveChannelMessageToAstra(msg: any) {
  const col = getCollection("messages");
  const id = msg.messageId || `m-${Math.random().toString(36).slice(2)}`;
  const base = {
    ...msg,
    _id: id,
    messageId: id,
    createdAt: msg.createdAt ?? nowISO(),
    updatedAt: nowISO(),
  };

  const existing = (await col.findOne?.({ _id: id, hotelId: msg.hotelId })) ?? null;
  if (existing) {
    if (!hasCompatibleMaterial(existing, base)) {
      throw new Error("MESSAGE_IDENTITY_CONFLICT");
    }
    return { status: "idempotent" as const, hotelId: msg.hotelId, messageId: id };
  } else {
    const foreign = (await col.findOne?.({ _id: id })) ?? null;
    if (foreign) throw new Error("MESSAGE_TENANT_COLLISION");
    await col.insertOne?.(base);
    return { status: "inserted" as const, hotelId: msg.hotelId, messageId: id };
  }
}

export const saveMessageToAstra = saveChannelMessageToAstra;

export async function updateMessageInAstra(
  hotelId: string,
  messageId: string,
  changes: any
) {
  const col = getCollection("messages");
  const immutablePatch = [
    "_id", "messageId", "hotelId", "conversationId", "channel", "direction",
    "content", "originalMessageId", "sourceMsgId", "sender", "guestId", "role",
    "subject", "timestamp", "time", "suggestion", "rich", "createdAt",
  ].find((field) => Object.prototype.hasOwnProperty.call(changes, field));
  if (immutablePatch) throw new Error("MESSAGE_IDENTITY_PATCH_REJECTED");
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

export async function getMessageByOriginalId(hotelId: string, originalMessageId: string) {
  if (!hotelId || !originalMessageId) return null;
  const col = getCollection("messages");
  return (await col.findOne?.({ hotelId, originalMessageId })) ?? null;
}

export const getMessageByOriginalIdScoped = getMessageByOriginalId;

export async function getMessageBySourceId(hotelId: string, conversationId: string, sourceMsgId: string) {
  if (!hotelId || !conversationId || !sourceMsgId) return null;
  const col = getCollection("messages");
  return (await col.findOne?.({ hotelId, conversationId, sourceMsgId })) ?? null;
}

export async function getMessageById(hotelId: string, messageId: string) {
  if (!hotelId || !messageId) return null;
  const col = getCollection("messages");
  return (await col.findOne?.({ _id: messageId, hotelId })) ?? null;
}

export async function saveMessageIdempotent(
  doc: any,
  _opts?: { idempotencyKey?: string }
) {
  if (doc?.originalMessageId) {
    const exists = await getMessageByOriginalId(doc.hotelId, doc.originalMessageId);
    if (exists) {
      if (!hasCompatibleMaterial(exists, doc)) throw new Error("MESSAGE_IDENTITY_CONFLICT");
      return { ok: true, id: exists.messageId, deduped: true };
    }
  }
  if (doc?.sourceMsgId && doc?.conversationId) {
    const exists = await getMessageBySourceId(doc.hotelId, doc.conversationId, doc.sourceMsgId);
    if (exists) {
      if (!hasCompatibleMaterial(exists, doc)) throw new Error("MESSAGE_IDENTITY_CONFLICT");
      return { ok: true, id: exists.messageId, deduped: true };
    }
  }
  await saveChannelMessageToAstra(doc);
  return { ok: true, id: doc.messageId, deduped: false };
}

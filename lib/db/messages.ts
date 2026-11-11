// Path: /root/begasist/lib/db/messages.ts
import { getAstraDB } from "@/lib/astra/connection";
import type { Channel, ChannelMessage } from "@/types/channel";
import type { RichPayload } from "@/types/richPayload";

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
  // UI enriquecida (opcional)
  rich?: RichPayload;
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

export type MessageStorageErrorCode =
  | "MESSAGE_TENANT_COLLISION"
  | "MESSAGE_IDENTITY_CONFLICT"
  | "MESSAGE_IDENTITY_PATCH_REJECTED"
  | "MESSAGE_NOT_FOUND"
  | "MESSAGE_STORAGE_ERROR"
  | "MESSAGE_STORAGE_UNCERTAIN";

export class MessageStorageError extends Error {
  readonly code: MessageStorageErrorCode;
  readonly hotelId: string;
  readonly messageId: string;
  readonly storageState: "not_persisted" | "uncertain";
  readonly retry: "do_not_retry" | "reconcile_before_retry";

  constructor(input: {
    code: MessageStorageErrorCode;
    message: string;
    hotelId: string;
    messageId: string;
    storageState: "not_persisted" | "uncertain";
    retry: "do_not_retry" | "reconcile_before_retry";
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "MessageStorageError";
    this.code = input.code;
    this.hotelId = input.hotelId;
    this.messageId = input.messageId;
    this.storageState = input.storageState;
    this.retry = input.retry;
  }
}

export type MessagePersistenceResult = Readonly<{
  status: "inserted" | "idempotent" | "reconciled";
  hotelId: string;
  messageId: string;
}>;

export type MessageMutationResult = Readonly<{
  status: "updated" | "reconciled";
  hotelId: string;
  messageId: string;
}>;

export const MESSAGE_IMMUTABLE_FIELDS = [
  "_id",
  "messageId",
  "hotelId",
  "conversationId",
  "channel",
  "direction",
  "content",
  "originalMessageId",
  "sourceMsgId",
  "sender",
  "guestId",
  "role",
  "subject",
  "timestamp",
  "time",
  "suggestion",
  "rich",
  "createdAt",
] as const satisfies ReadonlyArray<keyof MessageDoc>;

export const MESSAGE_MUTABLE_OPERATIONAL_FIELDS = [
  "status",
  "approvedResponse",
  "respondedBy",
  "deliveredAt",
  "deliveryError",
  "deliveryAttempts",
  "meta",
  "updatedAt",
] as const satisfies ReadonlyArray<keyof MessageDoc>;

const MESSAGE_RETRY_MATERIAL_FIELDS = MESSAGE_IMMUTABLE_FIELDS.filter(
  (field) => field !== "createdAt",
);

const EXTERNAL_DEDUPE_MATERIAL_FIELDS = MESSAGE_RETRY_MATERIAL_FIELDS.filter(
  (field) => field !== "_id" && field !== "messageId",
);

function requireMessageIdentity(value: unknown, field: "hotelId" | "messageId"): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(`${field} requerido para persistencia tenant-scoped`);
  }
  return value;
}

function normalizedConversationId(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function valuesEquivalent(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function messagePayloadMatches(existing: MessageDoc, desired: MessageDoc): boolean {
  return MESSAGE_RETRY_MATERIAL_FIELDS.every((field) =>
    desired[field] === undefined || valuesEquivalent(existing[field], desired[field])
  );
}

function externalDedupePayloadMatches(existing: MessageDoc, desired: MessageDoc): boolean {
  return EXTERNAL_DEDUPE_MATERIAL_FIELDS.every((field) =>
    desired[field] === undefined || valuesEquivalent(existing[field], desired[field])
  );
}

function assertExternalDedupeCompatible(
  existing: MessageDoc,
  desired: MessageDoc,
  dedupeField: "originalMessageId" | "sourceMsgId",
): void {
  if (!externalDedupePayloadMatches(existing, desired)) {
    throw messageStorageError({
      code: "MESSAGE_IDENTITY_CONFLICT",
      hotelId: desired.hotelId,
      messageId: desired.messageId,
      message: `${dedupeField} already exists with incompatible immutable message material`,
    });
  }
}

function messagePatchMatches(existing: MessageDoc, patch: Partial<MessageDoc>): boolean {
  return Object.entries(patch).every(([field, value]) =>
    value === undefined || valuesEquivalent((existing as any)[field], value)
  );
}

function hasSameMessageIdentity(existing: MessageDoc, desired: MessageDoc): boolean {
  return existing._id === desired._id &&
    existing.messageId === desired.messageId &&
    existing.hotelId === desired.hotelId &&
    existing.channel === desired.channel &&
    normalizedConversationId(existing.conversationId) === normalizedConversationId(desired.conversationId);
}

function isUncertainStorageError(error: unknown): boolean {
  const candidate = error as { name?: unknown; code?: unknown; message?: unknown } | null;
  const text = [candidate?.name, candidate?.code, candidate?.message]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
  return /timeout|timed out|abort|deadline|econnreset|socket hang up|network/.test(text);
}

function messageStorageError(input: {
  code: MessageStorageErrorCode;
  hotelId: string;
  messageId: string;
  message: string;
  uncertain?: boolean;
  cause?: unknown;
}): MessageStorageError {
  return new MessageStorageError({
    code: input.code,
    hotelId: input.hotelId,
    messageId: input.messageId,
    message: input.message,
    storageState: input.uncertain ? "uncertain" : "not_persisted",
    retry: input.uncertain ? "reconcile_before_retry" : "do_not_retry",
    cause: input.cause,
  });
}

async function findMessageByPhysicalId(messageId: string): Promise<MessageDoc | null> {
  const doc = await col().findOne({ _id: messageId });
  return (doc as MessageDoc) ?? null;
}

async function reconcileMessageInsert(
  desired: MessageDoc,
  cause?: unknown,
): Promise<MessagePersistenceResult> {
  const hotelId = desired.hotelId;
  const messageId = desired.messageId;
  let scoped: MessageDoc | null;
  let physical: MessageDoc | null;
  try {
    scoped = (await col().findOne({ _id: messageId, hotelId }) as MessageDoc | null) ?? null;
    if (scoped) {
      if (!hasSameMessageIdentity(scoped, desired) || !messagePayloadMatches(scoped, desired)) {
        throw messageStorageError({
          code: "MESSAGE_IDENTITY_CONFLICT",
          hotelId,
          messageId,
          message: "messageId already exists with different immutable identity or payload",
          cause,
        });
      }
      return {
        status: cause && isUncertainStorageError(cause) ? "reconciled" : cause ? "idempotent" : "inserted",
        hotelId,
        messageId,
      };
    }
    physical = await findMessageByPhysicalId(messageId);
  } catch (error) {
    if (error instanceof MessageStorageError) throw error;
    throw messageStorageError({
      code: "MESSAGE_STORAGE_UNCERTAIN",
      hotelId,
      messageId,
      message: "message persistence could not be reconciled",
      uncertain: true,
      cause: error,
    });
  }

  if (physical && physical.hotelId !== hotelId) {
    throw messageStorageError({
      code: "MESSAGE_TENANT_COLLISION",
      hotelId,
      messageId,
      message: "messageId is already owned by another hotel",
      cause,
    });
  }
  if (physical) {
    throw messageStorageError({
      code: "MESSAGE_IDENTITY_CONFLICT",
      hotelId,
      messageId,
      message: "messageId already exists with incompatible identity",
      cause,
    });
  }
  if (!cause || isUncertainStorageError(cause)) {
    throw messageStorageError({
      code: "MESSAGE_STORAGE_UNCERTAIN",
      hotelId,
      messageId,
      message: "message insert result is not observable",
      uncertain: true,
      cause,
    });
  }
  throw messageStorageError({
    code: "MESSAGE_STORAGE_ERROR",
    hotelId,
    messageId,
    message: "message insert failed",
    cause,
  });
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
    rich: (msg as any).rich,

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

/** Inserta un MessageDoc con PK inmutable; retries exactos son idempotentes. */
export async function saveMessageToAstra(doc: MessageDoc): Promise<MessagePersistenceResult> {
  const id = requireMessageIdentity(doc.messageId, "messageId");
  const hotelId = requireMessageIdentity(doc.hotelId, "hotelId");
  const now = nowISO();
  const persisted: MessageDoc = {
    ...doc,
    _id: id,
    messageId: id,
    hotelId,
    createdAt: doc.createdAt ?? now,
    updatedAt: now,
  };

  try {
    const result = await col().insertOne(persisted);
    if (String(result?.insertedId ?? "") !== id) {
      return reconcileMessageInsert(persisted);
    }
    return reconcileMessageInsert(persisted);
  } catch (error) {
    return reconcileMessageInsert(persisted, error);
  }
}

/** ✅ Guardar partiendo de ChannelMessage */
export async function saveChannelMessageToAstra(msg: ChannelMessage): Promise<MessagePersistenceResult> {
  const doc = toDoc(msg);
  return saveMessageToAstra(doc);
}

/** Actualiza campos de un mensaje ya guardado */
export async function updateMessageInAstra(
  hotelId: string,
  messageId: string,
  changes: Partial<MessageDoc>
): Promise<MessageMutationResult> {
  const canonicalHotelId = requireMessageIdentity(hotelId, "hotelId");
  const _id = requireMessageIdentity(messageId, "messageId");
  const forbiddenIdentityFields: ReadonlyArray<keyof MessageDoc> = MESSAGE_IMMUTABLE_FIELDS;
  const forbiddenPatch = forbiddenIdentityFields.find((field) => Object.prototype.hasOwnProperty.call(changes, field));
  if (forbiddenPatch) {
    throw messageStorageError({
      code: "MESSAGE_IDENTITY_PATCH_REJECTED",
      hotelId: canonicalHotelId,
      messageId: _id,
      message: `message identity field cannot be updated: ${forbiddenPatch}`,
    });
  }
  const toSet: Partial<MessageDoc> = { ...changes, updatedAt: nowISO() };
  let result: any;
  let writeError: unknown;
  try {
    result = await col().updateOne({ _id, hotelId: canonicalHotelId }, { $set: toSet });
    if (result?.matchedCount === 1) {
      return { status: "updated", hotelId: canonicalHotelId, messageId: _id };
    }
  } catch (error) {
    writeError = error;
  }

  let scoped: MessageDoc | null;
  let physical: MessageDoc | null;
  try {
    scoped = (await col().findOne({ _id, hotelId: canonicalHotelId }) as MessageDoc | null) ?? null;
    if (scoped && messagePatchMatches(scoped, toSet)) {
      return { status: "reconciled", hotelId: canonicalHotelId, messageId: _id };
    }
    physical = scoped ? scoped : await findMessageByPhysicalId(_id);
  } catch (error) {
    throw messageStorageError({
      code: "MESSAGE_STORAGE_UNCERTAIN",
      hotelId: canonicalHotelId,
      messageId: _id,
      message: "message update could not be reconciled",
      uncertain: true,
      cause: error,
    });
  }

  if (physical && physical.hotelId !== canonicalHotelId) {
    throw messageStorageError({
      code: "MESSAGE_TENANT_COLLISION",
      hotelId: canonicalHotelId,
      messageId: _id,
      message: "messageId is owned by another hotel",
      cause: writeError,
    });
  }
  if (writeError && isUncertainStorageError(writeError)) {
    throw messageStorageError({
      code: "MESSAGE_STORAGE_UNCERTAIN",
      hotelId: canonicalHotelId,
      messageId: _id,
      message: "message update result is uncertain",
      uncertain: true,
      cause: writeError,
    });
  }
  if (physical) {
    throw messageStorageError({
      code: "MESSAGE_STORAGE_ERROR",
      hotelId: canonicalHotelId,
      messageId: _id,
      message: "message update was not applied",
      cause: writeError,
    });
  }
  throw messageStorageError({
    code: "MESSAGE_NOT_FOUND",
    hotelId: canonicalHotelId,
    messageId: _id,
    message: "message was not found for hotel",
    cause: writeError,
  });
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
  const hotelId = requireMessageIdentity(msg.hotelId, "hotelId");
  if (msg.originalMessageId) {
    const already = await getMessageByOriginalId(hotelId, msg.originalMessageId);
    if (already) {
      assertExternalDedupeCompatible(already, msg, "originalMessageId");
      return {
        ok: true,
        id: already._id || already.messageId,
        deduped: true,
        status: "deduped" as const,
        idempotencyKeyApplied: false,
      };
    }
  }
  if (msg.sourceMsgId && msg.conversationId) {
    const already = await getMessageBySourceId(hotelId, msg.conversationId, msg.sourceMsgId);
    if (already) {
      assertExternalDedupeCompatible(already, msg, "sourceMsgId");
      return {
        ok: true,
        id: already._id || already.messageId,
        deduped: true,
        status: "deduped" as const,
        idempotencyKeyApplied: false,
      };
    }
  }
  // Reserved for a future persisted contract; it is not a dedupe authority today.
  void opts?.idempotencyKey;
  const persisted = await saveMessageToAstra(msg);
  return {
    ok: true,
    id: persisted.messageId,
    deduped: persisted.status === "idempotent",
    status: persisted.status,
    idempotencyKeyApplied: false,
  };
}

/** ✅ Idempotencia partiendo de ChannelMessage */
export async function saveChannelMessageIdempotent(
  msg: ChannelMessage,
  opts?: { idempotencyKey?: string }
) {
  const doc = toDoc(msg);
  return saveMessageIdempotent(doc, opts);
}

/** Idempotencia tenant-scoped por originalMessageId. */
export async function getMessageByOriginalId(
  hotelId: string,
  originalMessageId: string
): Promise<MessageDoc | null> {
  if (!hotelId || !originalMessageId) return null;
  const doc = await col().findOne({ hotelId, originalMessageId });
  return (doc as MessageDoc) ?? null;
}

/** 🆕 Versión “scoped” por hotel (mejor para multi-hotel) */
export async function getMessageByOriginalIdScoped(
  hotelId: string,
  originalMessageId: string
): Promise<MessageDoc | null> {
  return getMessageByOriginalId(hotelId, originalMessageId);
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

/** Lectura tenant-scoped por messageId; no realiza fallback global. */
export async function getMessageById(hotelId: string, messageId: string): Promise<MessageDoc | null> {
  if (!hotelId || !messageId) return null;
  const _id = messageId;
  const doc = await col().findOne({ _id, hotelId });
  return (doc as MessageDoc) ?? null;
}

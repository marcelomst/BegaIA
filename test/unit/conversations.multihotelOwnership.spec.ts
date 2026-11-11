// Path: test/unit/conversations.multihotelOwnership.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

type Doc = Record<string, any>;

const astra = vi.hoisted(() => ({
  collections: new Map<string, Map<string, Doc>>(),
  sequence: 0,
  insertFailure: null as null | "before" | "after",
  updateFailure: null as null | "before" | "after",
  readFailure: false,
}));

vi.unmock("@/lib/db/conversations");
vi.unmock("@/lib/db/messages");

vi.mock("@/lib/astra/connection", () => {
  function clone<T>(value: T): T {
    return structuredClone(value);
  }

  function collectionDocs(name: string): Map<string, Doc> {
    let docs = astra.collections.get(name);
    if (!docs) {
      docs = new Map<string, Doc>();
      astra.collections.set(name, docs);
    }
    return docs;
  }

  function readPath(doc: Doc, path: string): { exists: boolean; value: any } {
    let current: any = doc;
    for (const part of path.split(".")) {
      if (current == null || !Object.prototype.hasOwnProperty.call(current, part)) {
        return { exists: false, value: undefined };
      }
      current = current[part];
    }
    return { exists: true, value: current };
  }

  function matches(doc: Doc, filter: Doc): boolean {
    return Object.entries(filter).every(([path, expected]) => {
      if (path === "$or") {
        return Array.isArray(expected) && expected.some((part) => matches(doc, part));
      }
      const actual = readPath(doc, path);
      if (expected && typeof expected === "object" && !Array.isArray(expected) && "$exists" in expected) {
        return actual.exists === Boolean(expected.$exists);
      }
      return actual.exists && actual.value === expected;
    });
  }

  function writePath(doc: Doc, path: string, value: any): void {
    const parts = path.split(".");
    let current = doc;
    for (const part of parts.slice(0, -1)) {
      if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts.at(-1)!] = clone(value);
  }

  function unsetPath(doc: Doc, path: string): void {
    const parts = path.split(".");
    let current: any = doc;
    for (const part of parts.slice(0, -1)) {
      if (!current?.[part]) return;
      current = current[part];
    }
    delete current[parts.at(-1)!];
  }

  function applyUpdate(doc: Doc, update: Doc): void {
    for (const [path, value] of Object.entries(update.$set || {})) writePath(doc, path, value);
    for (const path of Object.keys(update.$unset || {})) unsetPath(doc, path);
    for (const [path, pushSpec] of Object.entries(update.$push || {})) {
      const current = readPath(doc, path);
      const values = Array.isArray((pushSpec as any)?.$each) ? (pushSpec as any).$each : [pushSpec];
      const next = [...(Array.isArray(current.value) ? current.value : []), ...clone(values)];
      const slice = (pushSpec as any)?.$slice;
      writePath(doc, path, typeof slice === "number" && slice < 0 ? next.slice(slice) : next);
    }
  }

  return {
    getAstraDB: () => ({
      collection: (name: string) => ({
        async insertOne(input: Doc) {
          const docs = collectionDocs(name);
          const _id = String(input._id || `astra-auto-${++astra.sequence}`);
          if (astra.insertFailure === "before") {
            astra.insertFailure = null;
            const error: any = new Error("simulated insert timeout before write");
            error.code = "ETIMEDOUT";
            throw error;
          }
          if (docs.has(_id)) throw new Error(`duplicate key: ${_id}`);
          docs.set(_id, clone({ ...input, _id }));
          if (astra.insertFailure === "after") {
            astra.insertFailure = null;
            const error: any = new Error("simulated insert timeout after write");
            error.code = "ETIMEDOUT";
            throw error;
          }
          return { acknowledged: true, insertedId: _id };
        },
        async findOne(filter: Doc) {
          if (astra.readFailure) {
            astra.readFailure = false;
            const error: any = new Error("simulated reconciliation read timeout");
            error.code = "ETIMEDOUT";
            throw error;
          }
          const found = [...collectionDocs(name).values()].find((doc) => matches(doc, filter));
          return found ? clone(found) : null;
        },
        async updateOne(filter: Doc, update: Doc, options?: { upsert?: boolean }) {
          const docs = collectionDocs(name);
          if (astra.updateFailure === "before") {
            astra.updateFailure = null;
            const error: any = new Error("simulated update timeout before write");
            error.code = "ETIMEDOUT";
            throw error;
          }
          const entry = [...docs.entries()].find(([, doc]) => matches(doc, filter));
          if (entry) {
            const [id, current] = entry;
            const next = clone(current);
            applyUpdate(next, update);
            docs.set(id, next);
            if (astra.updateFailure === "after") {
              astra.updateFailure = null;
              const error: any = new Error("simulated update timeout after write");
              error.code = "ETIMEDOUT";
              throw error;
            }
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
          }
          if (!options?.upsert) {
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
          }
          const _id = String(filter._id || update.$setOnInsert?._id || "");
          if (!_id || docs.has(_id)) throw new Error(`duplicate key: ${_id}`);
          const inserted = clone({ ...(update.$setOnInsert || {}), _id });
          applyUpdate(inserted, update);
          docs.set(_id, inserted);
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: _id };
        },
      }),
    }),
  };
});

import {
  acquireConversationOwnership,
  createConversationWriterGuard,
  releaseConversationOwnership,
} from "@/lib/db/convState";
import {
  appendConversationReplyTrace,
  getConversationById,
  getOrCreateConversation,
  stampConversationReplyTrace,
  updateConversation,
} from "@/lib/db/conversations";
import { runWithConversationOwnership } from "@/lib/ownership/conversationOwnershipContext";
import {
  getMessageById,
  saveMessageIdempotent,
  saveMessageToAstra,
  updateMessageInAstra,
} from "@/lib/db/messages";

function writerGuard(hotelId: string) {
  return createConversationWriterGuard({
    operationId: `operation-${hotelId}`,
    writerKind: "multihotel-stateful-test",
    instanceId: `instance-${hotelId}`,
    buildId: "test-build",
    messageId: `inbound-${hotelId}`,
  });
}

function conversationInput(hotelId: string, guestId: string) {
  return {
    hotelId,
    conversationId: "shared-conversation",
    channel: "web" as const,
    guestId,
    startedAt: "2026-11-07T10:00:00.000Z",
    lastUpdatedAt: "2026-11-07T10:00:00.000Z",
    lang: "es",
  };
}

describe("tenant-scoped conversations with owned writers", () => {
  beforeEach(() => {
    astra.collections.clear();
    astra.sequence = 0;
    astra.insertFailure = null;
    astra.updateFailure = null;
    astra.readFailure = false;
  });

  it("keeps equal conversation ids isolated under concurrent stateful operations", async () => {
    const guardA = writerGuard("hotel-a");
    const guardB = writerGuard("hotel-b");
    const [ownershipA, ownershipB] = await Promise.all([
      acquireConversationOwnership("hotel-a", "shared-conversation", guardA),
      acquireConversationOwnership("hotel-b", "shared-conversation", guardB),
    ]);
    expect(ownershipA.status).toBe("acquired");
    expect(ownershipB.status).toBe("acquired");

    await Promise.all([
      runWithConversationOwnership(
        { hotelId: "hotel-a", conversationId: "shared-conversation", guard: guardA },
        async () => {
          await getOrCreateConversation(conversationInput("hotel-a", "guest-a"));
          await Promise.resolve();
          await updateConversation("hotel-a", "shared-conversation", { guestId: "guest-a-bound" });
          await stampConversationReplyTrace("hotel-a", "shared-conversation", {
            messageId: "reply-a-0",
            timestamp: "2026-11-07T10:00:01.000Z",
            source: "hotel-a",
          });
          await appendConversationReplyTrace("hotel-a", "shared-conversation", {
            messageId: "reply-a-1",
            timestamp: "2026-11-07T10:00:02.000Z",
            source: "hotel-a",
          });
        },
      ),
      runWithConversationOwnership(
        { hotelId: "hotel-b", conversationId: "shared-conversation", guard: guardB },
        async () => {
          await getOrCreateConversation(conversationInput("hotel-b", "guest-b"));
          await updateConversation("hotel-b", "shared-conversation", { guestId: "guest-b-bound" });
          await Promise.resolve();
          await stampConversationReplyTrace("hotel-b", "shared-conversation", {
            messageId: "reply-b-0",
            timestamp: "2026-11-07T10:00:03.000Z",
            source: "hotel-b",
          });
          await appendConversationReplyTrace("hotel-b", "shared-conversation", {
            messageId: "reply-b-1",
            timestamp: "2026-11-07T10:00:04.000Z",
            source: "hotel-b",
          });
        },
      ),
    ]);

    await Promise.all([
      runWithConversationOwnership(
        { hotelId: "hotel-b", conversationId: "shared-conversation", guard: guardB },
        () => appendConversationReplyTrace("hotel-b", "shared-conversation", {
          messageId: "reply-b-2",
          timestamp: "2026-11-07T10:00:05.000Z",
          source: "hotel-b",
        }),
      ),
      runWithConversationOwnership(
        { hotelId: "hotel-a", conversationId: "shared-conversation", guard: guardA },
        () => appendConversationReplyTrace("hotel-a", "shared-conversation", {
          messageId: "reply-a-2",
          timestamp: "2026-11-07T10:00:06.000Z",
          source: "hotel-a",
        }),
      ),
    ]);

    const [conversationA, conversationB] = await Promise.all([
      getConversationById("hotel-a", "shared-conversation"),
      getConversationById("hotel-b", "shared-conversation"),
    ]);
    expect(conversationA).toMatchObject({
      hotelId: "hotel-a",
      conversationId: "shared-conversation",
      guestId: "guest-a-bound",
      metadata: {
        lastResponseTrace: { messageId: "reply-a-2", source: "hotel-a" },
        responseTraceHistory: [
          { messageId: "reply-a-1", source: "hotel-a" },
          { messageId: "reply-a-2", source: "hotel-a" },
        ],
      },
    });
    expect(conversationB).toMatchObject({
      hotelId: "hotel-b",
      conversationId: "shared-conversation",
      guestId: "guest-b-bound",
      metadata: {
        lastResponseTrace: { messageId: "reply-b-2", source: "hotel-b" },
        responseTraceHistory: [
          { messageId: "reply-b-1", source: "hotel-b" },
          { messageId: "reply-b-2", source: "hotel-b" },
        ],
      },
    });
    expect((conversationA as any)._id).not.toBe((conversationB as any)._id);
    expect(await getConversationById("hotel-c", "shared-conversation")).toBeNull();

    await expect(updateConversation("hotel-a", "shared-conversation", { hotelId: "hotel-b" }))
      .rejects.toThrow("hotelId mismatch");
    expect((await getConversationById("hotel-b", "shared-conversation"))?.guestId).toBe("guest-b-bound");

    expect(await Promise.all([
      releaseConversationOwnership("hotel-a", "shared-conversation", guardA),
      releaseConversationOwnership("hotel-b", "shared-conversation", guardB),
    ])).toEqual([{ status: "released" }, { status: "released" }]);
  });
});

describe("messages physical PK collision characterization", () => {
  beforeEach(() => {
    astra.collections.clear();
    astra.sequence = 0;
    astra.insertFailure = null;
    astra.updateFailure = null;
    astra.readFailure = false;
  });

  it("rejects a foreign PK collision and preserves the original message", async () => {
    await expect(saveMessageToAstra({
      messageId: "provider-shared-message",
      hotelId: "hotel-a",
      channel: "whatsapp",
      conversationId: "conversation-a",
      content: "hotel-a-content",
    })).resolves.toMatchObject({ status: "inserted", hotelId: "hotel-a" });

    await expect(saveMessageToAstra({
      messageId: "provider-shared-message",
      hotelId: "hotel-b",
      channel: "whatsapp",
      conversationId: "conversation-b",
      content: "hotel-b-content",
    })).rejects.toMatchObject({
      name: "MessageStorageError",
      code: "MESSAGE_TENANT_COLLISION",
      storageState: "not_persisted",
      retry: "do_not_retry",
    });

    expect(await getMessageById("hotel-a", "provider-shared-message")).toMatchObject({
      _id: "provider-shared-message",
      messageId: "provider-shared-message",
      hotelId: "hotel-a",
      conversationId: "conversation-a",
      content: "hotel-a-content",
    });
    expect(await getMessageById("hotel-b", "provider-shared-message")).toBeNull();
    expect(astra.collections.get("messages")?.size).toBe(1);
  });

  it("does not dedupe originalMessageId or sourceMsgId across hotels", async () => {
    const first = await saveMessageIdempotent({
      messageId: "message-a",
      hotelId: "hotel-a",
      channel: "whatsapp",
      conversationId: "conversation-a",
      originalMessageId: "provider-original-shared",
      sourceMsgId: "provider-source-shared",
      content: "hotel-a",
    });
    const second = await saveMessageIdempotent({
      messageId: "message-b",
      hotelId: "hotel-b",
      channel: "whatsapp",
      conversationId: "conversation-b",
      originalMessageId: "provider-original-shared",
      sourceMsgId: "provider-source-shared",
      content: "hotel-b",
    });

    expect(first).toMatchObject({ ok: true, deduped: false, idempotencyKeyApplied: false });
    expect(second).toMatchObject({ ok: true, deduped: false, idempotencyKeyApplied: false });
    expect(await getMessageById("hotel-a", "message-a")).toMatchObject({ content: "hotel-a" });
    expect(await getMessageById("hotel-b", "message-b")).toMatchObject({ content: "hotel-b" });
  });

  it("keeps exact same-hotel retries idempotent and rejects identity reassignment", async () => {
    const message = {
      messageId: "same-hotel-message",
      hotelId: "hotel-a",
      channel: "web" as const,
      conversationId: "conversation-a",
      content: "original",
    };
    await expect(saveMessageToAstra(message)).resolves.toMatchObject({ status: "inserted" });
    await expect(saveMessageToAstra(message)).resolves.toMatchObject({ status: "idempotent" });
    await expect(saveMessageToAstra({ ...message, conversationId: "conversation-other" }))
      .rejects.toMatchObject({ code: "MESSAGE_IDENTITY_CONFLICT" });
    expect(await getMessageById("hotel-a", message.messageId)).toMatchObject({
      conversationId: "conversation-a",
      content: "original",
    });
  });

  it("scopes reads and updates and rejects generic identity patches", async () => {
    await saveMessageToAstra({
      messageId: "update-scoped-message",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "original",
      status: "pending",
    });

    await expect(updateMessageInAstra("hotel-b", "update-scoped-message", { status: "sent" }))
      .rejects.toMatchObject({ code: "MESSAGE_TENANT_COLLISION" });
    await expect(updateMessageInAstra("hotel-a", "update-scoped-message", { content: "changed" }))
      .rejects.toMatchObject({ code: "MESSAGE_IDENTITY_PATCH_REJECTED" });
    await expect(updateMessageInAstra("hotel-a", "update-scoped-message", { hotelId: "hotel-b" }))
      .rejects.toMatchObject({ code: "MESSAGE_IDENTITY_PATCH_REJECTED" });
    await expect(updateMessageInAstra("hotel-a", "update-scoped-message", { conversationId: "conversation-b" }))
      .rejects.toMatchObject({ code: "MESSAGE_IDENTITY_PATCH_REJECTED" });
    await expect(updateMessageInAstra("hotel-a", "update-scoped-message", { status: "sent" }))
      .resolves.toMatchObject({ status: "updated" });

    expect(await getMessageById("hotel-b", "update-scoped-message")).toBeNull();
    expect(await getMessageById("hotel-a", "update-scoped-message")).toMatchObject({
      hotelId: "hotel-a",
      conversationId: "conversation-a",
      content: "original",
      status: "sent",
    });
  });

  it("reconciles an applied insert timeout and fails closed when persistence is unobservable", async () => {
    astra.insertFailure = "after";
    await expect(saveMessageToAstra({
      messageId: "timeout-applied",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "persisted",
    })).resolves.toMatchObject({ status: "reconciled" });

    astra.insertFailure = "before";
    await expect(saveMessageToAstra({
      messageId: "timeout-not-observable",
      hotelId: "hotel-b",
      channel: "web",
      conversationId: "conversation-b",
      content: "unknown",
    })).rejects.toMatchObject({
      code: "MESSAGE_STORAGE_UNCERTAIN",
      storageState: "uncertain",
      retry: "reconcile_before_retry",
    });
    expect(await getMessageById("hotel-b", "timeout-not-observable")).toBeNull();

    astra.insertFailure = null;
    await saveMessageToAstra({
      messageId: "timeout-not-observable",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "foreign-winner",
    });
    await expect(saveMessageToAstra({
      messageId: "timeout-not-observable",
      hotelId: "hotel-b",
      channel: "web",
      conversationId: "conversation-b",
      content: "unknown",
    })).rejects.toMatchObject({ code: "MESSAGE_TENANT_COLLISION" });
    expect(await getMessageById("hotel-a", "timeout-not-observable")).toMatchObject({
      content: "foreign-winner",
      conversationId: "conversation-a",
    });
  });

  it("allows only one tenant to win a concurrent physical-id collision", async () => {
    const attempts = await Promise.allSettled([
      saveMessageToAstra({
        messageId: "concurrent-shared-message",
        hotelId: "hotel-a",
        channel: "web",
        conversationId: "conversation-a",
        content: "hotel-a",
      }),
      saveMessageToAstra({
        messageId: "concurrent-shared-message",
        hotelId: "hotel-b",
        channel: "web",
        conversationId: "conversation-b",
        content: "hotel-b",
      }),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((attempt) => attempt.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "MESSAGE_TENANT_COLLISION" });
    expect(astra.collections.get("messages")?.size).toBe(1);
  });

  it("tolerates operational status changes when reconciling an exact retry", async () => {
    const original = {
      messageId: "operational-status-retry",
      hotelId: "hotel-a",
      channel: "whatsapp" as const,
      conversationId: "conversation-a",
      direction: "out" as const,
      content: "same material payload",
      status: "pending" as const,
    };
    await saveMessageToAstra(original);
    await updateMessageInAstra("hotel-a", original.messageId, { status: "sent" });

    await expect(saveMessageToAstra(original)).resolves.toMatchObject({ status: "idempotent" });
    expect(await getMessageById("hotel-a", original.messageId)).toMatchObject({
      content: "same material payload",
      status: "sent",
    });
  });

  it("tolerates deliveredAt changes without reverting delivery state on retry", async () => {
    const original = {
      messageId: "operational-delivery-retry",
      hotelId: "hotel-a",
      channel: "whatsapp" as const,
      conversationId: "conversation-a",
      direction: "out" as const,
      content: "delivered payload",
    };
    await saveMessageToAstra(original);
    await updateMessageInAstra("hotel-a", original.messageId, {
      deliveredAt: "2026-11-07T12:00:00.000Z",
      deliveryAttempts: 1,
    });

    await expect(saveMessageToAstra(original)).resolves.toMatchObject({ status: "idempotent" });
    expect(await getMessageById("hotel-a", original.messageId)).toMatchObject({
      deliveredAt: "2026-11-07T12:00:00.000Z",
      deliveryAttempts: 1,
    });
  });

  it("fails uncertain when the post-insert reconciliation read fails", async () => {
    astra.readFailure = true;
    await expect(saveMessageToAstra({
      messageId: "insert-read-failure",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "persisted but unreadable",
    })).rejects.toMatchObject({
      code: "MESSAGE_STORAGE_UNCERTAIN",
      storageState: "uncertain",
      retry: "reconcile_before_retry",
    });
    expect(await getMessageById("hotel-a", "insert-read-failure")).toMatchObject({
      content: "persisted but unreadable",
    });
  });

  it("classifies a foreign winner discovered while reconciling an uncertain insert", async () => {
    await saveMessageToAstra({
      messageId: "uncertain-foreign-winner",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "hotel-a",
    });
    astra.insertFailure = "before";
    await expect(saveMessageToAstra({
      messageId: "uncertain-foreign-winner",
      hotelId: "hotel-b",
      channel: "web",
      conversationId: "conversation-b",
      content: "hotel-b",
    })).rejects.toMatchObject({
      code: "MESSAGE_TENANT_COLLISION",
      storageState: "not_persisted",
    });
  });

  it("reconciles an applied update timeout and preserves the applied patch", async () => {
    await saveMessageToAstra({
      messageId: "update-timeout-after",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "update target",
      status: "pending",
    });
    astra.updateFailure = "after";
    await expect(updateMessageInAstra("hotel-a", "update-timeout-after", { status: "sent" }))
      .resolves.toMatchObject({ status: "reconciled" });
    expect(await getMessageById("hotel-a", "update-timeout-after")).toMatchObject({ status: "sent" });
  });

  it("keeps update outcome uncertain when a timeout happens before the patch", async () => {
    await saveMessageToAstra({
      messageId: "update-timeout-before",
      hotelId: "hotel-a",
      channel: "web",
      conversationId: "conversation-a",
      content: "update target",
      status: "pending",
    });
    astra.updateFailure = "before";
    await expect(updateMessageInAstra("hotel-a", "update-timeout-before", { status: "sent" }))
      .rejects.toMatchObject({
        code: "MESSAGE_STORAGE_UNCERTAIN",
        storageState: "uncertain",
        retry: "reconcile_before_retry",
      });
    expect(await getMessageById("hotel-a", "update-timeout-before")).toMatchObject({ status: "pending" });
  });

  it("rejects incompatible originalMessageId reuse inside one hotel", async () => {
    await saveMessageIdempotent({
      messageId: "original-first",
      hotelId: "hotel-a",
      channel: "email",
      conversationId: "conversation-a",
      direction: "in",
      sender: "first@example.com",
      originalMessageId: "shared-original-id",
      content: "first payload",
    });
    await expect(saveMessageIdempotent({
      messageId: "original-second",
      hotelId: "hotel-a",
      channel: "email",
      conversationId: "conversation-a",
      direction: "in",
      sender: "second@example.com",
      originalMessageId: "shared-original-id",
      content: "different payload",
    })).rejects.toMatchObject({ code: "MESSAGE_IDENTITY_CONFLICT" });
  });

  it("dedupes a materially compatible external retry after delivery state changed", async () => {
    const material = {
      hotelId: "hotel-a",
      channel: "email" as const,
      conversationId: "conversation-a",
      direction: "in" as const,
      sender: "guest@example.com",
      originalMessageId: "external-retry-after-delivery",
      content: "same inbound payload",
      status: "pending" as const,
    };
    await saveMessageIdempotent({ ...material, messageId: "external-first" });
    await updateMessageInAstra("hotel-a", "external-first", {
      status: "delivered",
      deliveredAt: "2026-11-07T13:00:00.000Z",
      deliveryAttempts: 2,
    });

    await expect(saveMessageIdempotent({ ...material, messageId: "external-retry" }))
      .resolves.toMatchObject({
        ok: true,
        id: "external-first",
        deduped: true,
        status: "deduped",
      });
    expect(await getMessageById("hotel-a", "external-first")).toMatchObject({
      status: "delivered",
      deliveredAt: "2026-11-07T13:00:00.000Z",
      deliveryAttempts: 2,
    });
  });

  it("rejects incompatible sourceMsgId reuse inside one conversation", async () => {
    await saveMessageIdempotent({
      messageId: "source-first",
      hotelId: "hotel-a",
      channel: "whatsapp",
      conversationId: "conversation-a",
      direction: "in",
      sender: "guest-a",
      sourceMsgId: "shared-source-id",
      content: "first payload",
    });
    await expect(saveMessageIdempotent({
      messageId: "source-second",
      hotelId: "hotel-a",
      channel: "whatsapp",
      conversationId: "conversation-a",
      direction: "in",
      sender: "guest-a",
      sourceMsgId: "shared-source-id",
      content: "different payload",
    })).rejects.toMatchObject({ code: "MESSAGE_IDENTITY_CONFLICT" });
  });

  it("documents that concurrent logical dedupe pre-reads are not atomic without an index", async () => {
    const shared = {
      hotelId: "hotel-a",
      channel: "email" as const,
      conversationId: "conversation-a",
      direction: "in" as const,
      sender: "guest@example.com",
      originalMessageId: "logical-race-id",
      content: "same provider payload",
    };
    const results = await Promise.all([
      saveMessageIdempotent({ ...shared, messageId: "logical-race-a" }),
      saveMessageIdempotent({ ...shared, messageId: "logical-race-b" }),
    ]);

    expect(results).toEqual([
      expect.objectContaining({ ok: true, deduped: false }),
      expect.objectContaining({ ok: true, deduped: false }),
    ]);
    expect(astra.collections.get("messages")?.size).toBe(2);
  });
});

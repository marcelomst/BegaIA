// Path: test/unit/guestConversationGrantPersistence.spec.ts

import { describe, expect, it } from "vitest";
import { getCollection } from "../mocks/astra";

vi.unmock("@/lib/db/conversations");

import {
  createConversation,
  getConversationById,
  revokeGuestWebGrantIfActive,
  updateConversation,
} from "@/lib/db/conversations";
import {
  createGuestWebGrant,
  revokeGuestConversationGrant,
} from "@/lib/auth/guestConversationCapability";
import {
  acquireConversationOwnership,
  createConversationWriterGuard,
  releaseConversationOwnership,
} from "@/lib/db/convState";
import { runWithConversationOwnership } from "@/lib/ownership/conversationOwnershipContext";

async function withOwnership<T>(hotelId: string, conversationId: string, operation: () => Promise<T>): Promise<T> {
  const guard = createConversationWriterGuard({
    operationId: `test-revoke-${crypto.randomUUID()}`,
    writerKind: "guest_web_grant_revocation",
    instanceId: "guest-grant-persistence-test",
    buildId: "test-build",
  });
  const acquisition = await acquireConversationOwnership(hotelId, conversationId, guard);
  expect(acquisition.status).toBe("acquired");
  if (acquisition.status !== "acquired") throw new Error("test ownership acquisition failed");
  try {
    return await runWithConversationOwnership(
      { hotelId, conversationId, guard: acquisition.guard },
      operation,
    );
  } finally {
    expect(await releaseConversationOwnership(hotelId, conversationId, acquisition.guard))
      .toMatchObject({ status: "released" });
  }
}

describe("Guest Web grant conversation persistence", () => {
  it("revokes with a nested CAS while preserving concurrent foreign metadata", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const conversationId = `conv-${crypto.randomUUID()}`;
    const grant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({
      hotelId,
      conversationId,
      channel: "web",
      lang: "es",
      guestId: `guest-${crypto.randomUUID()}`,
      metadata: { guestWebGrant: grant, auditMarker: { created: true } },
    });
    const revokedAt = new Date().toISOString();

    const [revocation] = await Promise.all([
      withOwnership(hotelId, conversationId, () => revokeGuestWebGrantIfActive({
          hotelId,
          conversationId,
          expectedJtiHash: grant.jtiHash,
          revokedAt,
        })),
      updateConversation(hotelId, conversationId, {
        metadata: { concurrentMarker: { preserved: true } },
      }),
    ]);
    expect(revocation).toEqual({ status: "revoked_confirmed", revokedAt });

    const persisted = await getConversationById(hotelId, conversationId);
    expect(persisted?.metadata).toMatchObject({
      auditMarker: { created: true },
      concurrentMarker: { preserved: true },
      guestWebGrant: { jtiHash: grant.jtiHash, revokedAt },
    });
    expect(await getCollection("conversations").count({ hotelId, conversationId })).toBe(1);
  });

  it("rejects generic grant replacement and a stale revocation cannot mutate another grant", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const conversationId = `conv-${crypto.randomUUID()}`;
    const grant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({ hotelId, conversationId, channel: "web", lang: "es", metadata: { guestWebGrant: grant } });

    await expect(updateConversation(hotelId, conversationId, {
      metadata: { guestWebGrant: { ...grant, revokedAt: null } },
    })).rejects.toThrow(/security-managed/);
    await expect(revokeGuestWebGrantIfActive({
        hotelId,
        conversationId,
        expectedJtiHash: grant.jtiHash,
        revokedAt: new Date().toISOString(),
      })).rejects.toThrow(/requires matching conversation ownership/);
    const stale = await withOwnership(hotelId, conversationId, () => revokeGuestWebGrantIfActive({
        hotelId,
        conversationId,
        expectedJtiHash: "0".repeat(64),
        revokedAt: new Date().toISOString(),
      }));
    expect(stale).toEqual({ status: "unknown", reason: "revocation_grant_mismatch" });
    expect((await getConversationById(hotelId, conversationId))?.metadata?.guestWebGrant).toEqual(grant);
  });

  it("confirms active state after a timeout before the revocation write", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const conversationId = `conv-${crypto.randomUUID()}`;
    const grant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({ hotelId, conversationId, channel: "web", lang: "es", metadata: { guestWebGrant: grant } });
    const conversations = getCollection("conversations");
    const originalUpdate = conversations.updateOne.bind(conversations);
    vi.spyOn(conversations, "updateOne").mockImplementation(async (filter, update, options) => {
      if ((update as any)?.$set?.["metadata.guestWebGrant.revokedAt"]) {
        const error: any = new Error("timeout before CAS");
        error.code = "ETIMEDOUT";
        throw error;
      }
      return originalUpdate(filter, update, options);
    });

    const result = await withOwnership(hotelId, conversationId, () => revokeGuestWebGrantIfActive({
      hotelId,
      conversationId,
      expectedJtiHash: grant.jtiHash,
      revokedAt: new Date().toISOString(),
    }));
    expect(result).toEqual({ status: "active_confirmed" });
  });

  it("confirms revocation after a timeout thrown after the CAS became durable", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const conversationId = `conv-${crypto.randomUUID()}`;
    const grant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({ hotelId, conversationId, channel: "web", lang: "es", metadata: { guestWebGrant: grant } });
    const revokedAt = new Date().toISOString();
    const conversations = getCollection("conversations");
    const originalUpdate = conversations.updateOne.bind(conversations);
    vi.spyOn(conversations, "updateOne").mockImplementation(async (filter, update, options) => {
      const result = await originalUpdate(filter, update, options);
      if ((update as any)?.$set?.["metadata.guestWebGrant.revokedAt"]) {
        const error: any = new Error("timeout after CAS");
        error.code = "ETIMEDOUT";
        throw error;
      }
      return result;
    });

    const result = await withOwnership(hotelId, conversationId, () => revokeGuestWebGrantIfActive({
      hotelId,
      conversationId,
      expectedJtiHash: grant.jtiHash,
      revokedAt,
    }));
    expect(result).toEqual({ status: "revoked_confirmed", revokedAt });
  });

  it("returns unknown when revocation readback cannot establish durable state", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const conversationId = `conv-${crypto.randomUUID()}`;
    const grant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({ hotelId, conversationId, channel: "web", lang: "es", metadata: { guestWebGrant: grant } });
    const conversations = getCollection("conversations");
    vi.spyOn(conversations, "updateOne").mockRejectedValueOnce(Object.assign(new Error("write timeout"), { code: "ETIMEDOUT" }));
    vi.spyOn(conversations, "findOne").mockRejectedValueOnce(Object.assign(new Error("read timeout"), { code: "ETIMEDOUT" }));

    const result = await withOwnership(hotelId, conversationId, () => revokeGuestWebGrantIfActive({
      hotelId,
      conversationId,
      expectedJtiHash: grant.jtiHash,
      revokedAt: new Date().toISOString(),
    }));
    expect(result).toEqual({ status: "unknown", reason: "revocation_readback_error" });
  });

  it("distinguishes a non-matching CAS from an already durable revocation", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const activeConversationId = `conv-${crypto.randomUUID()}`;
    const activeGrant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({
      hotelId,
      conversationId: activeConversationId,
      channel: "web",
      lang: "es",
      metadata: { guestWebGrant: activeGrant },
    });
    const conversations = getCollection("conversations");
    vi.spyOn(conversations, "updateOne").mockResolvedValueOnce({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedId: null,
    });
    const active = await withOwnership(hotelId, activeConversationId, () => revokeGuestWebGrantIfActive({
      hotelId,
      conversationId: activeConversationId,
      expectedJtiHash: activeGrant.jtiHash,
      revokedAt: new Date().toISOString(),
    }));
    expect(active).toEqual({ status: "active_confirmed" });

    vi.restoreAllMocks();
    const revokedConversationId = `conv-${crypto.randomUUID()}`;
    const revokedGrant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    revokedGrant.revokedAt = new Date().toISOString();
    await createConversation({
      hotelId,
      conversationId: revokedConversationId,
      channel: "web",
      lang: "es",
      metadata: { guestWebGrant: revokedGrant },
    });
    const already = await withOwnership(hotelId, revokedConversationId, () => revokeGuestWebGrantIfActive({
      hotelId,
      conversationId: revokedConversationId,
      expectedJtiHash: revokedGrant.jtiHash,
      revokedAt: new Date(Date.now() + 1000).toISOString(),
    }));
    expect(already).toEqual({ status: "revoked_confirmed", revokedAt: revokedGrant.revokedAt });
  });

  it("surfaces active-confirmed and unknown revocation outcomes with distinct contracts", async () => {
    const hotelId = `hotel-grant-${crypto.randomUUID()}`;
    const activeConversationId = `conv-${crypto.randomUUID()}`;
    const activeGrant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({
      hotelId,
      conversationId: activeConversationId,
      channel: "web",
      lang: "es",
      metadata: { guestWebGrant: activeGrant },
    });
    const conversations = getCollection("conversations");
    vi.spyOn(conversations, "updateOne").mockResolvedValueOnce({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
      upsertedCount: 0,
      upsertedId: null,
    });
    await expect(revokeGuestConversationGrant({
      hotelId,
      conversationId: activeConversationId,
      expectedJtiHash: activeGrant.jtiHash,
    })).rejects.toMatchObject({
      code: "guest_grant_revocation_not_applied",
      status: 409,
    });

    vi.restoreAllMocks();
    const unknownConversationId = `conv-${crypto.randomUUID()}`;
    const unknownGrant = createGuestWebGrant({ webSubject: `ws_${crypto.randomUUID()}`, jti: crypto.randomUUID() });
    await createConversation({
      hotelId,
      conversationId: unknownConversationId,
      channel: "web",
      lang: "es",
      metadata: { guestWebGrant: unknownGrant },
    });
    const originalFind = conversations.findOne.bind(conversations);
    vi.spyOn(conversations, "updateOne").mockRejectedValueOnce(
      Object.assign(new Error("write timeout"), { code: "ETIMEDOUT" }),
    );
    vi.spyOn(conversations, "findOne")
      .mockImplementationOnce((filter) => originalFind(filter))
      .mockRejectedValueOnce(Object.assign(new Error("read timeout"), { code: "ETIMEDOUT" }));
    await expect(revokeGuestConversationGrant({
      hotelId,
      conversationId: unknownConversationId,
      expectedJtiHash: unknownGrant.jtiHash,
    })).rejects.toMatchObject({
      code: "guest_grant_revocation_unknown",
      status: 503,
    });
  });
});

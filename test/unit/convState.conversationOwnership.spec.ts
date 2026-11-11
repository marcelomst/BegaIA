// Path: test/unit/convState.conversationOwnership.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

type Doc = Record<string, any>;

const astra = vi.hoisted(() => ({
  docs: new Map<string, Doc>(),
  updateOne: vi.fn(),
  findOne: vi.fn(),
  throwBeforeGuardWrite: false,
  throwAfterGuardWrite: false,
  throwBeforeGuardUnset: false,
  returnZeroWithoutUpsert: false,
  nextFindError: null as Error | null,
}));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

function matchesCondition(actual: { exists: boolean; value: any }, expected: any): boolean {
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
    return actual.exists && actual.value === expected;
  }
  if ("$exists" in expected && actual.exists !== Boolean(expected.$exists)) return false;
  return true;
}

function matches(doc: Doc, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([path, expected]) => {
    if (path === "$or") return expected.some((part: any) => matches(doc, part));
    return matchesCondition(readPath(doc, path), expected);
  });
}

function writePath(doc: Doc, path: string, value: any): void {
  const parts = path.split(".");
  let current = doc;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
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

function timeoutError(): Error {
  const error: any = new Error("simulated timeout");
  error.code = "ETIMEDOUT";
  return error;
}

function installStatefulAstra(): void {
  astra.updateOne.mockImplementation(async (filter: any, update: any, options?: any) => {
    const writesGuard = Boolean(update?.$set?.conversationWriterGuard);
    const unsetsGuard = Boolean(update?.$unset?.conversationWriterGuard);
    if (writesGuard && astra.throwBeforeGuardWrite) {
      astra.throwBeforeGuardWrite = false;
      throw timeoutError();
    }
    if (unsetsGuard && astra.throwBeforeGuardUnset) {
      astra.throwBeforeGuardUnset = false;
      throw timeoutError();
    }
    if (astra.returnZeroWithoutUpsert && options?.upsert) {
      astra.returnZeroWithoutUpsert = false;
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const current = [...astra.docs.values()].find((doc) => matches(doc, filter));
    if (!current) {
      if (!options?.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      const id = String(filter._id || update?.$setOnInsert?._id || "");
      if (!id || astra.docs.has(id)) throw new Error(`duplicate key: ${id}`);
      const inserted: Doc = { ...(update.$setOnInsert || {}), ...(update.$set || {}) };
      inserted._id = id;
      astra.docs.set(id, clone(inserted));
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: id };
    }

    const before = JSON.stringify(current);
    for (const [path, value] of Object.entries(update.$set || {})) writePath(current, path, value);
    for (const path of Object.keys(update.$unset || {})) unsetPath(current, path);
    astra.docs.set(current._id, current);
    if (writesGuard && astra.throwAfterGuardWrite) {
      astra.throwAfterGuardWrite = false;
      throw timeoutError();
    }
    return {
      matchedCount: 1,
      modifiedCount: JSON.stringify(current) === before ? 0 : 1,
      upsertedCount: 0,
    };
  });
  astra.findOne.mockImplementation(async (filter: any) => {
    if (astra.nextFindError) {
      const error = astra.nextFindError;
      astra.nextFindError = null;
      throw error;
    }
    const current = [...astra.docs.values()].find((doc) => matches(doc, filter));
    return current ? clone(current) : null;
  });
}

vi.mock("@/lib/astra/connection", () => ({
  getAstraDB: () => ({
    collection: () => ({
      updateOne: astra.updateOne,
      findOne: astra.findOne,
    }),
  }),
}));

import {
  CANCELLATION_EXECUTION_CONTRACT_VERSION,
  CONVERSATION_WRITER_GUARD_CONTRACT_VERSION,
  acquireConversationOwnership,
  assertConversationOwnership,
  createConversationWriterGuard,
  ensureConversationStateShell,
  isCancellationProviderExecutionEnabled,
  preparePendingCancellationAuthorization,
  releaseConversationOwnership,
  resolveConversationOwnershipAttempt,
  upsertConvState,
} from "@/lib/db/convState";
import type {
  CancellationExecution,
  ConversationWriterGuard,
} from "@/lib/db/convState";
import {
  getConversationOwnershipContext,
  runWithConversationOwnership,
} from "@/lib/ownership/conversationOwnershipContext";

function guard(operationId: string, overrides: Partial<ConversationWriterGuard> = {}): ConversationWriterGuard {
  return {
    contractVersion: CONVERSATION_WRITER_GUARD_CONTRACT_VERSION,
    token: `token-${operationId}`,
    operationId,
    writerKind: "test-writer",
    instanceId: "instance-01",
    buildId: "build-01",
    acquiredAt: "2026-11-06T10:00:00.000Z",
    messageId: `message-${operationId}`,
    ...overrides,
  };
}

describe("conv_state conversation ownership foundation", () => {
  beforeEach(() => {
    astra.docs.clear();
    astra.updateOne.mockReset();
    astra.findOne.mockReset();
    astra.throwBeforeGuardWrite = false;
    astra.throwAfterGuardWrite = false;
    astra.throwBeforeGuardUnset = false;
    astra.returnZeroWithoutUpsert = false;
    astra.nextFindError = null;
    installStatefulAstra();
  });

  it("creates unpredictable unique tokens without logging or automatic expiry metadata", async () => {
    const first = createConversationWriterGuard({
      operationId: "op-generated-1",
      writerKind: "message-handler",
      instanceId: "instance-a",
      buildId: "build-a",
    });
    const second = createConversationWriterGuard({
      operationId: "op-generated-2",
      writerKind: "message-handler",
      instanceId: "instance-a",
      buildId: "build-a",
    });
    expect(first.token).not.toBe(second.token);
    expect(first.token.length).toBeGreaterThanOrEqual(40);
    expect(first).not.toHaveProperty("expiresAt");
    expect(first).not.toHaveProperty("ttl");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      await acquireConversationOwnership("hotel-a", "conv-no-token-log", first);
      expect(JSON.stringify(logSpy.mock.calls)).not.toContain(first.token);
    } finally {
      logSpy.mockRestore();
    }
  });

  it("allows exactly one owner across two concurrent acquisitions", async () => {
    const attempts = await Promise.all([
      acquireConversationOwnership("hotel-a", "conv-race", guard("race-a")),
      acquireConversationOwnership("hotel-a", "conv-race", guard("race-b")),
    ]);
    expect(attempts.filter((result) => result.status === "acquired")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "occupied")).toHaveLength(1);
  });

  it("keeps identical conversation ids independent across hotels", async () => {
    const [first, second] = await Promise.all([
      acquireConversationOwnership("hotel-a", "same-conv", guard("hotel-a")),
      acquireConversationOwnership("hotel-b", "same-conv", guard("hotel-b")),
    ]);
    expect(first.status).toBe("acquired");
    expect(second.status).toBe("acquired");
    expect(astra.docs.size).toBe(2);
  });

  it("treats a retry with the same token as idempotently acquired", async () => {
    const attempted = guard("retry");
    expect((await acquireConversationOwnership("hotel-a", "conv-retry", attempted)).status).toBe("acquired");
    expect(await acquireConversationOwnership("hotel-a", "conv-retry", attempted)).toMatchObject({
      status: "acquired",
      idempotent: true,
    });
  });

  it("classifies a different token as occupied without exposing it in the summary", async () => {
    await acquireConversationOwnership("hotel-a", "conv-occupied", guard("owner"));
    const result = await acquireConversationOwnership("hotel-a", "conv-occupied", guard("contender"));
    expect(result.status).toBe("occupied");
    if (result.status === "occupied") expect(result.owner).not.toHaveProperty("token");
  });

  it("resolves an uncertain write by rereading with the original token", async () => {
    astra.throwAfterGuardWrite = true;
    const attempted = guard("uncertain-applied");
    const result = await acquireConversationOwnership("hotel-a", "conv-uncertain", attempted);
    expect(result.status).toBe("acquired");
    expect((await resolveConversationOwnershipAttempt("hotel-a", "conv-uncertain", attempted)).status).toBe("acquired");
  });

  it("does not convert a timeout with no observable token into rejection or success", async () => {
    astra.throwBeforeGuardWrite = true;
    const result = await acquireConversationOwnership("hotel-a", "conv-timeout", guard("timeout"));
    expect(result.status).toBe("uncertain");
  });

  it("classifies a deterministic storage read failure as error rather than uncertain", async () => {
    astra.nextFindError = new Error("malformed response");
    const result = await acquireConversationOwnership("hotel-a", "conv-read-error", guard("read-error"));
    expect(result).toEqual({ status: "error", reason: "read_error" });
  });

  it("fails closed for malformed or unknown-version guards", async () => {
    astra.docs.set("hotel-a:conv-malformed", {
      _id: "hotel-a:conv-malformed",
      hotelId: "hotel-a",
      conversationId: "conv-malformed",
      updatedAt: "2026-11-06T10:00:00.000Z",
      conversationWriterGuard: { ...guard("bad"), contractVersion: "unknown-v9" },
    });
    expect((await assertConversationOwnership("hotel-a", "conv-malformed", guard("candidate"))).status).toBe("malformed");
    await expect(upsertConvState("hotel-a", "conv-malformed", { lastCategory: "reservation" })).rejects.toThrow(/blocked/i);
  });

  it("creates a canonical shell for a missing document and preserves legacy documents", async () => {
    expect(await ensureConversationStateShell("hotel-a", "conv-new")).toEqual({ status: "ready" });
    expect(astra.docs.get("hotel-a:conv-new")).toMatchObject({
      _id: "hotel-a:conv-new",
      hotelId: "hotel-a",
      conversationId: "conv-new",
    });
    astra.docs.set("hotel-a:conv-legacy", {
      _id: "hotel-a:conv-legacy",
      hotelId: "hotel-a",
      conversationId: "conv-legacy",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await upsertConvState("hotel-a", "conv-legacy", { lastCategory: "amenities_info" });
    expect(astra.docs.get("hotel-a:conv-legacy")?.lastCategory).toBe("amenities_info");
  });

  it("releases only the exact token and classifies an uncertain release", async () => {
    const owned = guard("release-owner");
    await acquireConversationOwnership("hotel-a", "conv-release", owned);
    expect((await releaseConversationOwnership(
      "hotel-a",
      "conv-release",
      guard("release-other", { acquiredAt: owned.acquiredAt }),
    )).status).toBe("not_owner");
    expect((await assertConversationOwnership("hotel-a", "conv-release", owned)).status).toBe("owned");

    astra.throwBeforeGuardUnset = true;
    expect((await releaseConversationOwnership("hotel-a", "conv-release", owned)).status).toBe("uncertain");
    expect((await assertConversationOwnership("hotel-a", "conv-release", owned)).status).toBe("owned");
    expect((await releaseConversationOwnership("hotel-a", "conv-release", owned)).status).toBe("released");
  });

  it("allows owned mutation only with the exact in-process context", async () => {
    const owned = guard("owned-write");
    await acquireConversationOwnership("hotel-a", "conv-owned-write", owned);
    await runWithConversationOwnership(
      { hotelId: "hotel-a", conversationId: "conv-owned-write", guard: owned },
      async () => {
        expect(getConversationOwnershipContext()?.guard.token).toBe(owned.token);
        await upsertConvState("hotel-a", "conv-owned-write", { lastCategory: "reservation" });
      },
    );
    expect(astra.docs.get("hotel-a:conv-owned-write")?.lastCategory).toBe("reservation");
    await expect(runWithConversationOwnership(
      {
        hotelId: "hotel-a",
        conversationId: "conv-owned-write",
        guard: { ...owned, operationId: "wrong-operation" },
      },
      () => upsertConvState("hotel-a", "conv-owned-write", { lastCategory: "amenities_info" }),
    )).rejects.toThrow(/lost ownership CAS/i);
    await expect(upsertConvState("hotel-a", "conv-owned-write", { lastCategory: "amenities_info" })).rejects.toThrow(/active ownership/i);
  });

  it("applies the same ownership predicate to specialized conv_state CAS mutations", async () => {
    const owned = guard("specialized-cas");
    await acquireConversationOwnership("hotel-a", "conv-specialized", owned);
    const authorization = {
      reservationId: "RES-SPECIALIZED",
      canonicalGuestId: "guest-a",
      presentedFingerprint: "sha256:specialized",
      issuedForMessageId: "message-specialized",
      issuedAt: "2026-11-06T10:01:00.000Z",
    };

    expect(await preparePendingCancellationAuthorization(
      "hotel-a",
      "conv-specialized",
      authorization,
    )).toMatchObject({ matched: false, matchedCount: 0 });

    await runWithConversationOwnership(
      { hotelId: "hotel-a", conversationId: "conv-specialized", guard: owned },
      async () => {
        expect(await preparePendingCancellationAuthorization(
          "hotel-a",
          "conv-specialized",
          authorization,
        )).toMatchObject({ matched: true, matchedCount: 1 });
      },
    );
  });

  it("protects reserved fields and never falls back to an alternative insert after no match", async () => {
    await expect(upsertConvState("hotel-a", "conv-reserved", {
      conversationWriterGuard: guard("injected"),
    } as any)).rejects.toThrow(/reserved field/i);
    await expect(upsertConvState("hotel-a", "conv-reserved", {
      cancellationExecution: {
        contractVersion: CANCELLATION_EXECUTION_CONTRACT_VERSION,
        operationId: "op",
        reservationId: "RES-1",
        authorizationFingerprint: "sha256:test",
        state: "prepared",
        updatedAt: "2026-11-06T10:00:00.000Z",
      },
    } as any)).rejects.toThrow(/reserved field/i);

    astra.returnZeroWithoutUpsert = true;
    await expect(upsertConvState("hotel-a", "conv-no-fallback", { lastCategory: "reservation" })).rejects.toThrow(/not durably applied/i);
    expect(astra.docs.has("hotel-a:conv-no-fallback")).toBe(false);
  });

  it("permits reentry only for the same ownership and forbids a second conversation", async () => {
    const owned = guard("nested");
    const context = { hotelId: "hotel-a", conversationId: "conv-nested", guard: owned };
    await runWithConversationOwnership(context, async () => {
      await expect(runWithConversationOwnership(context, async () => "ok")).resolves.toBe("ok");
      await expect(runWithConversationOwnership(
        { ...context, guard: guard("different-token") },
        async () => "unsafe",
      )).rejects.toThrow(/same conversation and token/i);
      await expect(runWithConversationOwnership(
        { ...context, conversationId: "conv-other" },
        async () => "unsafe",
      )).rejects.toThrow(/same conversation and token/i);
    });
    expect(getConversationOwnershipContext()).toBeNull();
  });

  it("keeps simultaneous ALS contexts isolated across deferred callbacks", async () => {
    const first = { hotelId: "hotel-a", conversationId: "conv-als-a", guard: guard("als-a") };
    const second = { hotelId: "hotel-b", conversationId: "conv-als-b", guard: guard("als-b") };
    const observed = await Promise.all([
      runWithConversationOwnership(first, async () => {
        await Promise.resolve();
        return new Promise<string | undefined>((resolve) => {
          setTimeout(() => resolve(getConversationOwnershipContext()?.guard.operationId), 0);
        });
      }),
      runWithConversationOwnership(second, async () => {
        await Promise.resolve();
        return new Promise<string | undefined>((resolve) => {
          setTimeout(() => resolve(getConversationOwnershipContext()?.guard.operationId), 0);
        });
      }),
    ]);
    expect(observed).toEqual(["als-a", "als-b"]);
    expect(getConversationOwnershipContext()).toBeNull();
  });

  it("does not authorize a mutation for another hotel from an owned context", async () => {
    const owned = guard("hotel-isolation");
    await acquireConversationOwnership("hotel-a", "conv-hotel-isolation", owned);
    await expect(runWithConversationOwnership(
      { hotelId: "hotel-a", conversationId: "conv-hotel-isolation", guard: owned },
      () => upsertConvState("hotel-b", "conv-hotel-isolation", { lastCategory: "reservation" }),
    )).rejects.toThrow(/second conversation/i);
    expect(astra.docs.has("hotel-b:conv-hotel-isolation")).toBe(false);
  });

  it("does not expire or steal an old valid guard automatically", async () => {
    const old = guard("old-owner", { acquiredAt: "2000-01-01T00:00:00.000Z" });
    await acquireConversationOwnership("hotel-a", "conv-old", old);
    const contender = await acquireConversationOwnership("hotel-a", "conv-old", guard("new-owner"));
    expect(contender.status).toBe("occupied");
  });

  it("declares every ratified cancellation execution state without invoking a provider", () => {
    const states: CancellationExecution["state"][] = [
      "prepared",
      "provider_inflight",
      "provider_succeeded",
      "provider_failed_verified",
      "provider_result_unknown",
      "result_persisted",
      "aborted_before_provider",
    ];
    expect(states).toHaveLength(7);
    expect(isCancellationProviderExecutionEnabled()).toBe(false);
  });
});

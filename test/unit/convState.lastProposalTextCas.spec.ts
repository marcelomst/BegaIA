// Path: test/unit/convState.lastProposalTextCas.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const astra = vi.hoisted(() => ({
  updateOne: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
}));

vi.mock("@/lib/astra/connection", () => ({
  getAstraDB: () => ({
    collection: () => ({
      updateOne: astra.updateOne,
      findOne: astra.findOne,
      insertOne: astra.insertOne,
    }),
  }),
}));

import {
  compareCreateDraftRevisions,
  finalizeDeterministicCreateProposalIfCurrent,
  initializeCreateDraftIfLatest,
  publishDeterministicCreateProposalIfLatest,
  updateLastProposalTextIfCurrent,
} from "@/lib/db/convState";

type StatefulDoc = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readPath(doc: StatefulDoc, path: string): { exists: boolean; value: any } {
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
  if ("$lt" in expected && (!actual.exists || !(actual.value < expected.$lt))) return false;
  if ("$lte" in expected && (!actual.exists || !(actual.value <= expected.$lte))) return false;
  if ("$in" in expected && (!actual.exists || !expected.$in.includes(actual.value))) return false;
  return true;
}

function matchesFilter(doc: StatefulDoc, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([path, expected]) => {
    if (path === "$and") return expected.every((part: any) => matchesFilter(doc, part));
    if (path === "$or") return expected.some((part: any) => matchesFilter(doc, part));
    return matchesCondition(readPath(doc, path), expected);
  });
}

function writePath(doc: StatefulDoc, path: string, value: any): void {
  const parts = path.split(".");
  let current = doc;
  for (const part of parts.slice(0, -1)) {
    if (!current[part] || typeof current[part] !== "object") current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)!] = clone(value);
}

function unsetPath(doc: StatefulDoc, path: string): void {
  const parts = path.split(".");
  let current: any = doc;
  for (const part of parts.slice(0, -1)) {
    if (!current?.[part]) return;
    current = current[part];
  }
  delete current[parts.at(-1)!];
}

function installStatefulAstra(initial: StatefulDoc[] = []) {
  const docs = new Map(initial.map((doc) => [doc._id, clone(doc)]));
  astra.updateOne.mockImplementation(async (filter: any, update: any, options?: any) => {
    if (options?.upsert) throw new Error("stateful CAS double forbids upsert");
    const current = [...docs.values()].find((doc) => matchesFilter(doc, filter));
    if (!current) return { matchedCount: 0, modifiedCount: 0 };
    const before = JSON.stringify(current);
    for (const [path, value] of Object.entries(update.$set || {})) writePath(current, path, value);
    for (const path of Object.keys(update.$unset || {})) unsetPath(current, path);
    docs.set(current._id, current);
    return { matchedCount: 1, modifiedCount: JSON.stringify(current) === before ? 0 : 1 };
  });
  astra.findOne.mockImplementation(async (filter: any) => {
    const current = [...docs.values()].find((doc) => matchesFilter(doc, filter));
    return current ? clone(current) : null;
  });
  astra.insertOne.mockImplementation(async (doc: StatefulDoc) => {
    if (docs.has(doc._id)) {
      const error: any = new Error(`duplicate key: ${doc._id}`);
      error.errorDescriptors = [{ errorCode: "DOCUMENT_ALREADY_EXISTS" }];
      throw error;
    }
    docs.set(doc._id, clone(doc));
    return { acknowledged: true, insertedId: doc._id };
  });
  return { docs };
}

const identity = {
  sourceText: "Graph proposal",
  toolCallAt: "2026-10-12T12:00:00.000Z",
  input: {
    hotelId: "hotel999",
    roomType: "double",
    numGuests: 2,
    checkIn: "2027-11-10",
    checkOut: "2027-11-12",
  },
};

describe("convState conditional lastProposal text update", () => {
  beforeEach(() => {
    astra.updateOne.mockReset();
    astra.findOne.mockReset();
    astra.insertOne.mockReset();
  });

  it("uses an atomic exact-identity filter and only sets lastProposal.text", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const result = await updateLastProposalTextIfCurrent(
      "hotel999",
      "conv-pers01",
      identity,
      "Final proposal"
    );

    expect(astra.updateOne).toHaveBeenCalledWith(
      {
        _id: "hotel999:conv-pers01",
        "lastProposal.available": true,
        "lastProposal.text": { $in: ["Graph proposal", "Final proposal"] },
        "lastProposal.toolCall.name": "checkAvailability",
        "lastProposal.toolCall.outputSummary": "available:true",
        "lastProposal.toolCall.at": "2026-10-12T12:00:00.000Z",
        "lastProposal.toolCall.input.hotelId": "hotel999",
        "lastProposal.toolCall.input.roomType": "double",
        "lastProposal.toolCall.input.numGuests": 2,
        "lastProposal.toolCall.input.checkIn": "2027-11-10",
        "lastProposal.toolCall.input.checkOut": "2027-11-12",
      },
      { $set: { "lastProposal.text": "Final proposal" } }
    );
    expect(result).toEqual({ matched: true, modified: true, matchedCount: 1, modifiedCount: 1 });
  });

  it("reports an idempotent repeat as matched without claiming modification", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 0 });

    const result = await updateLastProposalTextIfCurrent(
      "hotel999",
      "conv-pers01",
      identity,
      "Final proposal"
    );

    expect(result).toEqual({ matched: true, modified: false, matchedCount: 1, modifiedCount: 0 });
  });

  it("treats matchedCount zero as lost correspondence", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

    const result = await updateLastProposalTextIfCurrent(
      "hotel999",
      "conv-pers01",
      identity,
      "Final proposal"
    );

    expect(result).toEqual({ matched: false, modified: false, matchedCount: 0, modifiedCount: 0 });
  });

  it("propagates SDK write failures to the caller", async () => {
    const failure = new Error("simulated Astra update failure");
    astra.updateOne.mockRejectedValue(failure);

    await expect(
      updateLastProposalTextIfCurrent("hotel999", "conv-pers01", identity, "Final proposal")
    ).rejects.toBe(failure);
  });
});

const deterministicIdentity = {
  sourceText: "Authoritative proposal",
  available: true,
  availabilityStatus: "available" as const,
  toolCallAt: "2026-10-15T12:00:00.000Z",
  outputSummary: "available:true" as const,
  input: {
    hotelId: "hotel999",
    roomType: "double",
    numGuests: 2,
    checkIn: "2027-12-10",
    checkOut: "2027-12-12",
  },
  snapshot: {
    guestName: "Martin Silva",
    roomType: "double",
    numGuests: "2",
    checkIn: "2027-12-10",
    checkOut: "2027-12-12",
    locale: "es",
  },
};

describe("convState deterministic create proposal finalization CAS", () => {
  beforeEach(() => {
    astra.updateOne.mockReset();
    astra.findOne.mockReset();
    astra.insertOne.mockReset();
  });

  it("matches tenant, rich proposal identity and snapshot without replacing lastProposal", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const result = await finalizeDeterministicCreateProposalIfCurrent(
      "hotel999",
      "conv-pers02",
      deterministicIdentity,
      "Observable proposal"
    );

    const [filter, update] = astra.updateOne.mock.calls[0];
    expect(filter).toMatchObject({
      _id: "hotel999:conv-pers02",
      hotelId: "hotel999",
      conversationId: "conv-pers02",
      "lastProposal.available": true,
      "lastProposal.availabilityStatus": "available",
      "lastProposal.text": { $in: ["Authoritative proposal", "Observable proposal"] },
      "lastProposal.toolCall.at": deterministicIdentity.toolCallAt,
      "lastProposal.toolCall.outputSummary": "available:true",
      "lastProposal.toolCall.input.hotelId": "hotel999",
      "lastProposal.snapshot.guestName": "Martin Silva",
      "reservationSlots.guestName": "Martin Silva",
      "reservationSlots.numGuests": "2",
    });
    expect(update.$set["lastProposal.text"]).toBe("Observable proposal");
    expect(update.$set.lastProposal).toBeUndefined();
    expect(update.$set).toMatchObject({
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      desiredAction: "create",
    });
    expect(result).toEqual({ matched: true, modified: true, matchedCount: 1, modifiedCount: 1 });
  });

  it("is idempotent when the exact same finalization is already applied", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 0 });

    const result = await finalizeDeterministicCreateProposalIfCurrent(
      "hotel999",
      "conv-pers02",
      deterministicIdentity,
      "Observable proposal"
    );

    expect(result).toEqual({ matched: true, modified: false, matchedCount: 1, modifiedCount: 0 });
  });

  it("treats mismatch and stale A after B as conservative no-ops", async () => {
    astra.updateOne.mockImplementation(async (filter: any) => (
      filter["lastProposal.toolCall.at"] === "2026-10-15T12:01:00.000Z"
        ? { matchedCount: 1, modifiedCount: 1 }
        : { matchedCount: 0, modifiedCount: 0 }
    ));
    const proposalB = {
      ...deterministicIdentity,
      sourceText: "Proposal B",
      toolCallAt: "2026-10-15T12:01:00.000Z",
    };

    const staleA = await finalizeDeterministicCreateProposalIfCurrent(
      "hotel999",
      "conv-race",
      deterministicIdentity,
      "Proposal A final"
    );
    const currentB = await finalizeDeterministicCreateProposalIfCurrent(
      "hotel999",
      "conv-race",
      proposalB,
      "Proposal B final"
    );

    expect(staleA.matched).toBe(false);
    expect(currentB.matched).toBe(true);
  });

  it("rejects a cross-tenant provider identity before issuing a write", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });

    const result = await finalizeDeterministicCreateProposalIfCurrent(
      "hotel-other",
      "conv-pers02",
      { ...deterministicIdentity, input: { ...deterministicIdentity.input, hotelId: "hotel999" } },
      "Observable proposal"
    );

    expect(result.matched).toBe(false);
    expect(astra.updateOne).not.toHaveBeenCalled();
  });
});

const deterministicProposal = {
  text: deterministicIdentity.sourceText,
  available: true,
  availabilityStatus: "available" as const,
  snapshot: deterministicIdentity.snapshot,
  options: [{ roomType: "double", pricePerNight: 120, currency: "USD" }],
  suggestedRoomType: "double",
  suggestedPricePerNight: 120,
  toolCall: {
    name: "checkAvailability" as const,
    input: deterministicIdentity.input,
    outputSummary: deterministicIdentity.outputSummary,
    at: deterministicIdentity.toolCallAt,
  },
};

describe("convState deterministic create rich proposal publication", () => {
  beforeEach(() => {
    astra.updateOne.mockReset();
    astra.findOne.mockReset();
    astra.insertOne.mockReset();
  });

  it("publishes the complete proposal only over an older canonical state", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const result = await publishDeterministicCreateProposalIfLatest(
      "hotel999",
      "conv-publish",
      deterministicIdentity,
      deterministicProposal,
    );

    const [filter, update] = astra.updateOne.mock.calls[0];
    expect(filter).toMatchObject({
      _id: "hotel999:conv-publish",
      hotelId: "hotel999",
      conversationId: "conv-publish",
      $and: expect.any(Array),
    });
    expect(update.$set.lastProposal).toEqual(deterministicProposal);
    expect(update.$set.lastProposal.options[0]).toEqual({
      roomType: "double",
      pricePerNight: 120,
      currency: "USD",
    });
    expect(update.$set).toMatchObject({
      "reservationSlots.guestName": "Martin Silva",
      "reservationSlots.roomType": "double",
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });
    expect(result).toEqual({ matched: true, modified: true, matchedCount: 1, modifiedCount: 1 });
    expect(astra.findOne).not.toHaveBeenCalled();
  });

  it("recognizes an identical publication as idempotent without resetting finalized state", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    astra.findOne.mockResolvedValue({ _id: "hotel999:conv-publish", lastProposal: deterministicProposal });

    const result = await publishDeterministicCreateProposalIfLatest(
      "hotel999",
      "conv-publish",
      deterministicIdentity,
      deterministicProposal,
    );

    expect(result).toEqual({ matched: true, modified: false, matchedCount: 1, modifiedCount: 0 });
    expect(astra.updateOne).toHaveBeenCalledTimes(1);
    expect(astra.findOne).toHaveBeenCalledWith(expect.objectContaining({
      "lastProposal.toolCall.at": deterministicIdentity.toolCallAt,
      "lastProposal.snapshot.guestName": "Martin Silva",
    }));
  });

  it("publishes an exact partial snapshot without inventing guest or occupancy fields", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    const partialIdentity = {
      ...deterministicIdentity,
      input: {
        hotelId: "hotel999",
        roomType: "double",
        checkIn: "2027-12-10",
        checkOut: "2027-12-12",
      },
      snapshot: {
        roomType: "double",
        checkIn: "2027-12-10",
        checkOut: "2027-12-12",
        locale: "es",
      },
    };
    const partialProposal = {
      ...deterministicProposal,
      snapshot: partialIdentity.snapshot,
      toolCall: {
        ...deterministicProposal.toolCall,
        input: partialIdentity.input,
      },
    };

    const result = await publishDeterministicCreateProposalIfLatest(
      "hotel999",
      "conv-partial",
      partialIdentity,
      partialProposal,
    );

    const [, update] = astra.updateOne.mock.calls[0];
    expect(update.$set["reservationSlots.roomType"]).toBe("double");
    expect(update.$set["reservationSlots.guestName"]).toBeUndefined();
    expect(update.$set["reservationSlots.numGuests"]).toBeUndefined();
    expect(result.matched).toBe(true);
  });

  it("rejects stale A after B and isolates tenants", async () => {
    astra.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    astra.findOne.mockResolvedValue(null);

    const stale = await publishDeterministicCreateProposalIfLatest(
      "hotel999",
      "conv-race",
      deterministicIdentity,
      deterministicProposal,
    );
    const crossTenant = await publishDeterministicCreateProposalIfLatest(
      "hotel-other",
      "conv-race",
      deterministicIdentity,
      deterministicProposal,
    );

    expect(stale.matched).toBe(false);
    expect(crossTenant.matched).toBe(false);
    expect(astra.updateOne).toHaveBeenCalledTimes(1);
  });

  it("propagates write and idempotency-read failures", async () => {
    astra.updateOne.mockRejectedValueOnce(new Error("write failed"));
    await expect(
      publishDeterministicCreateProposalIfLatest(
        "hotel999",
        "conv-write-error",
        deterministicIdentity,
        deterministicProposal,
      )
    ).rejects.toThrow("write failed");

    astra.updateOne.mockResolvedValueOnce({ matchedCount: 0, modifiedCount: 0 });
    astra.findOne.mockRejectedValueOnce(new Error("read failed"));
    await expect(
      publishDeterministicCreateProposalIfLatest(
        "hotel999",
        "conv-read-error",
        deterministicIdentity,
        deterministicProposal,
      )
    ).rejects.toThrow("read failed");
  });
});

const revisionA = {
  startedAt: "2026-10-19T12:00:00.000Z",
  messageId: "message-a",
};
const revisionB = {
  startedAt: "2026-10-19T12:01:00.000Z",
  messageId: "message-b",
};
const draftPatch = {
  reservationSlots: {
    guestName: "Sergio Ramos",
    roomType: "double",
    numGuests: "2",
    checkIn: "2027-11-19",
    checkOut: "2027-11-22",
    locale: "es",
  },
  pendingAvailabilityVerification: null,
  selectedReservationTarget: null,
  modifyState: null,
  conversationFocus: {
    domain: "reservation" as const,
    subFlow: "create" as const,
    active: true,
    updatedAt: revisionA.startedAt,
  },
  activeReservationContext: {
    kind: "draft" as const,
    phase: "collecting" as const,
    updatedAt: revisionA.startedAt,
  },
  activeFlow: "reservation" as const,
  desiredAction: "create" as const,
  salesStage: "qualify" as const,
  conversationStage: "reservation_collecting" as const,
  lastCategory: "reservation",
  updatedBy: "ai",
};

describe("convState atomic create draft initialization", () => {
  beforeEach(() => {
    astra.updateOne.mockReset();
    astra.findOne.mockReset();
    astra.insertOne.mockReset();
  });

  it("defines a deterministic total order with messageId as the stable tie-break", () => {
    expect(compareCreateDraftRevisions(revisionA, revisionB)).toBe(-1);
    expect(compareCreateDraftRevisions(revisionB, revisionA)).toBe(1);
    expect(compareCreateDraftRevisions(revisionA, { ...revisionA })).toBe(0);
    expect(compareCreateDraftRevisions(revisionA, { ...revisionA, messageId: "message-z" })).toBe(-1);
  });

  it("initializes a missing canonical document by _id without an upsert", async () => {
    const { docs } = installStatefulAstra();

    const result = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-new",
      revisionA,
      draftPatch,
    );

    expect(result).toEqual({
      accepted: true,
      idempotent: false,
      inserted: true,
      matchedCount: 1,
      modifiedCount: 1,
    });
    expect(astra.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "hotel999:conv-new", hotelId: "hotel999", conversationId: "conv-new" }),
      expect.objectContaining({ $unset: expect.objectContaining({ lastProposal: true }) }),
    );
    expect(astra.updateOne.mock.calls[0]?.[2]).toBeUndefined();
    expect(docs.get("hotel999:conv-new")).toMatchObject({
      _id: "hotel999:conv-new",
      hotelId: "hotel999",
      conversationId: "conv-new",
      createDraftRevision: revisionA,
      reservationSlots: draftPatch.reservationSlots,
    });
  });

  it("resolves two revisions competing to insert the same _id and keeps the logically newest", async () => {
    const { docs } = installStatefulAstra();

    const [resultA, resultB] = await Promise.all([
      initializeCreateDraftIfLatest("hotel999", "conv-insert-race", revisionA, draftPatch),
      initializeCreateDraftIfLatest("hotel999", "conv-insert-race", revisionB, {
        ...draftPatch,
        reservationSlots: { ...draftPatch.reservationSlots, roomType: "suite" },
      }),
    ]);

    expect(resultA.accepted).toBe(true);
    expect(resultB.accepted).toBe(true);
    expect(astra.insertOne).toHaveBeenCalledTimes(2);
    expect(docs).toHaveLength(1);
    expect(docs.get("hotel999:conv-insert-race")).toMatchObject({
      createDraftRevision: revisionB,
      reservationSlots: { roomType: "suite" },
    });
  });

  it("keeps B when the newer revision wins the initial insert before A", async () => {
    const { docs } = installStatefulAstra();

    const [resultB, resultA] = await Promise.all([
      initializeCreateDraftIfLatest("hotel999", "conv-insert-race-b-first", revisionB, {
        ...draftPatch,
        reservationSlots: { ...draftPatch.reservationSlots, roomType: "suite" },
      }),
      initializeCreateDraftIfLatest(
        "hotel999",
        "conv-insert-race-b-first",
        revisionA,
        draftPatch,
      ),
    ]);

    expect(resultB.accepted).toBe(true);
    expect(resultA.accepted).toBe(false);
    expect(astra.insertOne).toHaveBeenCalledTimes(2);
    expect(docs).toHaveLength(1);
    expect(docs.get("hotel999:conv-insert-race-b-first")).toMatchObject({
      createDraftRevision: revisionB,
      reservationSlots: { roomType: "suite" },
    });
  });

  it("rejects A held before insert after B initializes and publishes", async () => {
    const { docs } = installStatefulAstra();
    const statefulInsert = astra.insertOne.getMockImplementation()!;
    let releaseA!: () => void;
    let markAWaiting!: () => void;
    const aWaiting = new Promise<void>((resolve) => { markAWaiting = resolve; });
    const aRelease = new Promise<void>((resolve) => { releaseA = resolve; });
    astra.insertOne.mockImplementation(async (doc: StatefulDoc) => {
      if (doc.createDraftRevision?.messageId === revisionA.messageId) {
        markAWaiting();
        await aRelease;
      }
      return statefulInsert(doc);
    });

    const runA = initializeCreateDraftIfLatest(
      "hotel999",
      "conv-held-a",
      revisionA,
      draftPatch,
    );
    await aWaiting;

    const resultB = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-held-a",
      revisionB,
      { ...draftPatch, reservationSlots: { ...draftPatch.reservationSlots, roomType: "suite" } },
    );
    const identityB = {
      ...deterministicIdentity,
      createDraftRevision: revisionB,
      toolCallAt: "2027-01-01T00:00:00.000Z",
      input: { ...deterministicIdentity.input, roomType: "suite" },
      snapshot: { ...deterministicIdentity.snapshot, roomType: "suite" },
    };
    const proposalB = {
      ...deterministicProposal,
      text: identityB.sourceText,
      snapshot: identityB.snapshot,
      toolCall: {
        ...deterministicProposal.toolCall!,
        input: identityB.input,
        at: identityB.toolCallAt,
      },
    };
    const publicationB = await publishDeterministicCreateProposalIfLatest(
      "hotel999",
      "conv-held-a",
      identityB,
      proposalB,
    );

    releaseA();
    const resultA = await runA;

    expect(resultB.accepted).toBe(true);
    expect(publicationB.matched).toBe(true);
    expect(resultA.accepted).toBe(false);
    expect(docs.get("hotel999:conv-held-a")).toMatchObject({
      createDraftRevision: revisionB,
      reservationSlots: { roomType: "suite" },
      lastProposal: proposalB,
    });
  });

  it("rejects late A after B without changing B slots or deleting B proposal", async () => {
    const { docs } = installStatefulAstra();
    await initializeCreateDraftIfLatest("hotel999", "conv-stale", revisionB, {
      ...draftPatch,
      reservationSlots: { ...draftPatch.reservationSlots, roomType: "suite" },
    });
    const current = docs.get("hotel999:conv-stale")!;
    current.lastProposal = { ...deterministicProposal, text: "Proposal B" };
    const before = clone(current);

    const stale = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-stale",
      revisionA,
      draftPatch,
    );

    expect(stale).toEqual({
      accepted: false,
      idempotent: false,
      inserted: false,
      matchedCount: 0,
      modifiedCount: 0,
    });
    expect(docs.get("hotel999:conv-stale")).toEqual(before);
  });

  it("treats an identical revision as idempotent and preserves its current proposal", async () => {
    const { docs } = installStatefulAstra();
    await initializeCreateDraftIfLatest("hotel999", "conv-idempotent", revisionB, draftPatch);
    const current = docs.get("hotel999:conv-idempotent")!;
    current.lastProposal = { ...deterministicProposal, text: "Proposal B" };
    const before = clone(current);

    const repeated = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-idempotent",
      revisionB,
      { ...draftPatch, reservationSlots: { ...draftPatch.reservationSlots, roomType: "triple" } },
    );

    expect(repeated).toEqual({
      accepted: true,
      idempotent: true,
      inserted: false,
      matchedCount: 1,
      modifiedCount: 0,
    });
    expect(docs.get("hotel999:conv-idempotent")).toEqual(before);
  });

  it("enforces duplicate _id collisions instead of silently inserting a second document", async () => {
    const existing = {
      _id: "hotel999:conv-duplicate",
      hotelId: "other-hotel",
      conversationId: "other-conversation",
      updatedAt: revisionB.startedAt,
    };
    const { docs } = installStatefulAstra([existing]);

    const result = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-duplicate",
      revisionA,
      draftPatch,
    );

    expect(result.accepted).toBe(false);
    expect(astra.insertOne).toHaveBeenCalledTimes(1);
    expect(docs).toHaveLength(1);
    expect(docs.get(existing._id)).toEqual(existing);
  });

  it("propagates update, read and non-collision insert errors", async () => {
    astra.updateOne.mockRejectedValueOnce(new Error("update unavailable"));
    await expect(
      initializeCreateDraftIfLatest("hotel999", "conv-update-error", revisionA, draftPatch)
    ).rejects.toThrow("update unavailable");

    astra.updateOne.mockReset();
    astra.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    astra.findOne.mockRejectedValueOnce(new Error("read unavailable"));
    await expect(
      initializeCreateDraftIfLatest("hotel999", "conv-read-error", revisionA, draftPatch)
    ).rejects.toThrow("read unavailable");

    astra.findOne.mockReset();
    astra.findOne.mockResolvedValue(null);
    astra.insertOne.mockRejectedValueOnce(new Error("insert unavailable"));
    await expect(
      initializeCreateDraftIfLatest("hotel999", "conv-insert-error", revisionA, draftPatch)
    ).rejects.toThrow("insert unavailable");
  });

  it("adopts a legacy document only when it has no active proposal", async () => {
    const safeLegacy = {
      _id: "hotel999:conv-legacy-safe",
      hotelId: "hotel999",
      conversationId: "conv-legacy-safe",
      reservationSlots: { roomType: "single" },
      updatedAt: revisionA.startedAt,
    };
    const safeStore = installStatefulAstra([safeLegacy]);
    const adopted = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-legacy-safe",
      revisionB,
      draftPatch,
    );
    expect(adopted.accepted).toBe(true);
    expect(safeStore.docs.get(safeLegacy._id)?.createDraftRevision).toEqual(revisionB);

    const protectedLegacy = {
      _id: "hotel999:conv-legacy-protected",
      hotelId: "hotel999",
      conversationId: "conv-legacy-protected",
      reservationSlots: { roomType: "suite" },
      lastProposal: { ...deterministicProposal, text: "Legacy proposal" },
      updatedAt: revisionB.startedAt,
    };
    const protectedStore = installStatefulAstra([protectedLegacy]);
    const rejected = await initializeCreateDraftIfLatest(
      "hotel999",
      "conv-legacy-protected",
      revisionB,
      draftPatch,
    );
    expect(rejected.accepted).toBe(false);
    expect(protectedStore.docs.get(protectedLegacy._id)).toEqual(protectedLegacy);
  });

  it("rejects publication and finalization CAS when the canonical draft revision differs", async () => {
    const currentB = {
      _id: "hotel999:conv-revision-cas",
      hotelId: "hotel999",
      conversationId: "conv-revision-cas",
      createDraftRevision: revisionB,
      reservationSlots: deterministicIdentity.snapshot,
      lastProposal: deterministicProposal,
      updatedAt: deterministicIdentity.toolCallAt,
    };
    const { docs } = installStatefulAstra([currentB]);
    const identityA = { ...deterministicIdentity, createDraftRevision: revisionA };

    const publication = await publishDeterministicCreateProposalIfLatest(
      "hotel999",
      "conv-revision-cas",
      identityA,
      deterministicProposal,
    );
    const finalization = await finalizeDeterministicCreateProposalIfCurrent(
      "hotel999",
      "conv-revision-cas",
      identityA,
      "Observable proposal A",
    );

    expect(publication.matched).toBe(false);
    expect(finalization.matched).toBe(false);
    expect(docs.get(currentB._id)).toEqual(currentB);
  });
});

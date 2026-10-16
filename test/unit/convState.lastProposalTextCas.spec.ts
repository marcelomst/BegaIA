// Path: test/unit/convState.lastProposalTextCas.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const astra = vi.hoisted(() => ({
  updateOne: vi.fn(),
  findOne: vi.fn(),
}));

vi.mock("@/lib/astra/connection", () => ({
  getAstraDB: () => ({
    collection: () => ({ updateOne: astra.updateOne, findOne: astra.findOne }),
  }),
}));

import {
  finalizeDeterministicCreateProposalIfCurrent,
  publishDeterministicCreateProposalIfLatest,
  updateLastProposalTextIfCurrent,
} from "@/lib/db/convState";

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

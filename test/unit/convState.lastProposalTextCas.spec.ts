// Path: test/unit/convState.lastProposalTextCas.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const astra = vi.hoisted(() => ({
  updateOne: vi.fn(),
}));

vi.mock("@/lib/astra/connection", () => ({
  getAstraDB: () => ({
    collection: () => ({ updateOne: astra.updateOne }),
  }),
}));

import { updateLastProposalTextIfCurrent } from "@/lib/db/convState";

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

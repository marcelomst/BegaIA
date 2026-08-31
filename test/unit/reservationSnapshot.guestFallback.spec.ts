import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getConvState: vi.fn(),
  getConversationsByGuestId: vi.fn(),
  getGuest: vi.fn(),
  updateConversationState: vi.fn(),
}));

vi.mock("@/lib/db/convState", () => ({ getConvState: mocks.getConvState }));
vi.mock("@/lib/db/conversations", () => ({ getConversationsByGuestId: mocks.getConversationsByGuestId }));
vi.mock("@/lib/db/guests", () => ({ getGuest: mocks.getGuest }));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({ updateConversationState: mocks.updateConversationState }));

import { handleReservationSnapshotNode } from "@/lib/agents/nodes/reservationSnapshot";

const hotelId = "hotel999";
const guestId = "guest-canonical-1";
const currentConversationId = "conv-current";

function graphState(overrides: Record<string, unknown> = {}) {
  return {
    hotelId,
    guestId,
    conversationId: currentConversationId,
    detectedLanguage: "es",
    normalizedMessage: "mostrame mi reserva",
    reservationSlots: {},
    salesStage: "qualify",
    lastPresentedReservations: null,
    meta: {},
    ...overrides,
  } as any;
}

function reservation(reservationId: string, createdAt: string, guestName: string) {
  return {
    reservationId,
    status: "created",
    createdAt,
    channel: "email",
    guestName,
    roomType: "double",
    checkIn: "2026-09-08",
    checkOut: "2026-09-15",
    numGuests: "2",
  };
}

describe("reservationSnapshot guest-wide fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGuest.mockResolvedValue({ guestId, hotelId, name: "Martin Perez" });
    mocks.getConversationsByGuestId.mockResolvedValue([
      { conversationId: currentConversationId },
      { conversationId: "conv-email" },
    ]);
  });

  it("returns the minimal singular reference context without cloning the historical conversation", async () => {
    mocks.getConvState.mockImplementation(async (_hotelId: string, conversationId: string) => {
      if (conversationId === currentConversationId) return { hotelId, conversationId };
      return { reservationHistory: [reservation("RES-GRAPH-ONE", "2026-08-01T10:00:00.000Z", "Ana Perez")] };
    });

    const result = await handleReservationSnapshotNode(graphState());

    expect(String((result.messages[0] as any).content)).toContain("RES-GRAPH-ONE");
    expect(result.lastPresentedReservations).toMatchObject({
      guestId,
      reservations: [expect.objectContaining({ reservationId: "RES-GRAPH-ONE", guestName: "Ana Perez" })],
    });
    expect(result).not.toHaveProperty("reservationSlots");
    expect(result).not.toHaveProperty("salesStage");
    expect(result).not.toHaveProperty("desiredAction");
    expect(result).not.toHaveProperty("modifyState");
    expect(mocks.updateConversationState).toHaveBeenCalledWith(
      hotelId,
      currentConversationId,
      expect.objectContaining({ lastPresentedReservations: result.lastPresentedReservations }),
    );
  });

  it("returns plural guest-wide references in their presented order", async () => {
    mocks.getConvState.mockImplementation(async (_hotelId: string, conversationId: string) => {
      if (conversationId === currentConversationId) return { hotelId, conversationId };
      return {
        reservationHistory: [
          reservation("RES-GRAPH-FIRST", "2026-08-01T10:00:00.000Z", "Ana Perez"),
          reservation("RES-GRAPH-LAST", "2026-08-02T10:00:00.000Z", "Laura Gomez"),
        ],
      };
    });

    const result = await handleReservationSnapshotNode(graphState({ normalizedMessage: "mostrame mis reservas" }));
    const reply = String((result.messages[0] as any).content);

    expect(reply).toMatch(/RES-GRAPH-FIRST[\s\S]*RES-GRAPH-LAST/);
    expect(result.lastPresentedReservations?.reservations.map((item) => item.reservationId)).toEqual([
      "RES-GRAPH-FIRST",
      "RES-GRAPH-LAST",
    ]);
    expect(result).not.toHaveProperty("reservationHistory");
    expect(result).not.toHaveProperty("lastReservation");
    expect(result).not.toHaveProperty("reservationSlots");
    expect(mocks.updateConversationState).toHaveBeenCalledWith(
      hotelId,
      currentConversationId,
      expect.objectContaining({ lastPresentedReservations: result.lastPresentedReservations }),
    );
  });
});

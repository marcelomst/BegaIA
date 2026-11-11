// Path: test/unit/handleChannelMessage.conversationOwnership.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

let readOwnershipContext: () => any = () => null;

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  assertOwner: vi.fn(),
  createGuard: vi.fn(),
  release: vi.fn(),
  handleIncoming: vi.fn(),
  resolveGuestIdentity: vi.fn(),
  findActiveConversation: vi.fn(),
  getOrCreateConversation: vi.fn(),
  updateConversation: vi.fn(),
  updateGuest: vi.fn(),
  getMessages: vi.fn(),
}));

vi.mock("@/lib/db/convState", () => ({
  CONVSTATE_VERSION: "ownership-boundary-test",
  acquireConversationOwnership: mocks.acquire,
  assertConversationOwnership: mocks.assertOwner,
  createConversationWriterGuard: mocks.createGuard,
  releaseConversationOwnership: mocks.release,
}));

vi.mock("@/lib/handlers/messageHandler", () => ({
  handleIncomingMessage: mocks.handleIncoming,
  extractExplicitConversationalActorName: vi.fn(() => null),
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: mocks.resolveGuestIdentity,
}));

vi.mock("@/lib/db/conversations", () => ({
  findActiveConversationByGuestId: mocks.findActiveConversation,
  getOrCreateConversation: mocks.getOrCreateConversation,
  updateConversation: mocks.updateConversation,
}));

vi.mock("@/lib/db/guests", () => ({
  updateGuest: mocks.updateGuest,
}));

vi.mock("@/lib/adapters/registry", () => ({ getAdapter: vi.fn(() => null) }));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ channelConfigs: { web: { mode: "automatic" } } })),
}));
vi.mock("@/lib/services/messages", () => ({
  getMessagesByConversationService: mocks.getMessages,
}));
vi.mock("@/lib/utils/language", () => ({ detectLanguage: vi.fn(async () => "es") }));

function canonicalGuard(operationId = "turn-operation") {
  return {
    contractVersion: "conversation-writer-guard-v1" as const,
    token: `token-${operationId}`,
    operationId,
    writerKind: "common_channel_turn",
    instanceId: "instance-test",
    buildId: "build-test",
    acquiredAt: "2026-11-06T10:00:00.000Z",
    messageId: `message-${operationId}`,
  };
}

async function loadPipeline() {
  process.env.FORCE_GENERATION = "1";
  const [pipeline, ownership] = await Promise.all([
    import("@/lib/pipeline/handleChannelMessage"),
    import("@/lib/ownership/conversationOwnershipContext"),
  ]);
  readOwnershipContext = ownership.getConversationOwnershipContext;
  return { ...pipeline, ...ownership };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    hotelId: "hotel-a",
    conversationId: "conversation-a",
    channel: "web" as const,
    query: "hola",
    guestId: "guest-a",
    sender: "guest",
    sourceMsgId: "source-message-a",
    ...overrides,
  };
}

describe("handleChannelMessage first owned writer boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveGuestIdentity.mockImplementation(async ({ rawGuestId }: any) => ({ guestId: rawGuestId }));
    mocks.findActiveConversation.mockResolvedValue(null);
    mocks.getMessages.mockResolvedValue([]);
    mocks.getOrCreateConversation.mockResolvedValue(undefined);
    mocks.updateConversation.mockResolvedValue(undefined);
    mocks.createGuard.mockImplementation((args: any) => ({
      ...canonicalGuard(args.operationId),
      messageId: args.messageId,
    }));
    mocks.acquire.mockImplementation(async (_hotelId: string, _conversationId: string, guard: any) => ({
      status: "acquired",
      guard,
      idempotent: false,
    }));
    mocks.assertOwner.mockImplementation(async (_hotelId: string, _conversationId: string, guard: any) => ({
      status: "owned",
      guard,
    }));
    mocks.release.mockResolvedValue({ status: "released" });
    mocks.handleIncoming.mockResolvedValue(undefined);
  });

  it("acquires before inbound persistence, propagates ALS and releases after the turn", async () => {
    const observations: Array<{ phase: string; operationId?: string }> = [];
    mocks.acquire.mockImplementation(async (_hotelId: string, _conversationId: string, guard: any) => {
      observations.push({ phase: "acquire" });
      return { status: "acquired", guard, idempotent: false };
    });
    mocks.handleIncoming.mockImplementation(async () => {
      await Promise.resolve();
      observations.push({
        phase: "inbound",
        operationId: readOwnershipContext()?.guard.operationId,
      });
    });
    mocks.release.mockImplementation(async () => {
      observations.push({ phase: "release" });
      return { status: "released" };
    });
    const { handleChannelMessage } = await loadPipeline();

    await handleChannelMessage(input());

    expect(observations.map((item) => item.phase)).toEqual(["acquire", "inbound", "release"]);
    expect(observations[1]?.operationId).toMatch(/^channel-turn-/);
    expect(mocks.getOrCreateConversation).toHaveBeenCalledTimes(1);
    expect(readOwnershipContext()).toBeNull();
  });

  it.each([
    ["missing hotel", { hotelId: undefined }],
    ["empty hotel", { hotelId: "" }],
    ["hotel whitespace", { hotelId: " hotel-a" }],
    ["ambiguous hotel key", { hotelId: "hotel:a" }],
    ["empty explicit conversation", { conversationId: "" }],
    ["conversation whitespace", { conversationId: "conversation-a " }],
  ])("rejects non-canonical identity: %s", async (_label, override) => {
    const { handleChannelMessage } = await loadPipeline();
    await expect(handleChannelMessage(input(override))).rejects.toMatchObject({ status: 400 });
    expect(mocks.acquire).not.toHaveBeenCalled();
    expect(mocks.handleIncoming).not.toHaveBeenCalled();
  });

  it("isolates equal conversation ids across hotels", async () => {
    const seen: Array<{ hotelId?: string; conversationId?: string }> = [];
    mocks.handleIncoming.mockImplementation(async () => {
      await Promise.resolve();
      const context = readOwnershipContext();
      seen.push({ hotelId: context?.hotelId, conversationId: context?.conversationId });
    });
    const { handleChannelMessage } = await loadPipeline();

    await handleChannelMessage(input({ hotelId: "hotel-a", conversationId: "same-conversation", sourceMsgId: "source-a" }));
    await handleChannelMessage(input({ hotelId: "hotel-b", conversationId: "same-conversation", sourceMsgId: "source-b" }));

    expect(seen).toEqual(expect.arrayContaining([
      { hotelId: "hotel-a", conversationId: "same-conversation" },
      { hotelId: "hotel-b", conversationId: "same-conversation" },
    ]));
  });

  it.each(["occupied", "uncertain", "error"] as const)(
    "fails closed on %s acquisition without persisting inbound or binding",
    async (status) => {
      mocks.acquire.mockResolvedValueOnce(
        status === "occupied"
          ? { status, owner: { operationId: "other" } }
          : { status, reason: `${status}-reason` },
      );
      const { handleChannelMessage } = await loadPipeline();

      await expect(handleChannelMessage(input())).rejects.toMatchObject({
        name: "ChannelTurnOwnershipError",
        ownershipStatus: status,
        retryable: status === "occupied",
        channelTurnResult: {
          contractVersion: "channel-turn-result-v1",
          inboundPersistence: "not_attempted",
          retry: status === "occupied"
            ? "retry_later"
            : status === "uncertain"
              ? "reconcile_before_retry"
              : "do_not_retry",
        },
      });
      expect(mocks.handleIncoming).not.toHaveBeenCalled();
      expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
      expect(mocks.updateConversation).not.toHaveBeenCalled();
    },
  );

  it("stops before inbound when ownership is lost after acquisition", async () => {
    mocks.assertOwner.mockResolvedValueOnce({ status: "occupied", owner: { operationId: "replacement" } });
    const { handleChannelMessage } = await loadPipeline();

    await expect(handleChannelMessage(input())).rejects.toMatchObject({
      ownershipStatus: "lost",
      retryable: false,
    });
    expect(mocks.handleIncoming).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ status: "not_owner", owner: { operationId: "replacement" } }, "not_owner"],
    [{ status: "uncertain", reason: "release_write_timeout" }, "uncertain"],
    [{ status: "error", reason: "release_read_error" }, "error"],
  ] as const)("reports an unverified release without replaying the turn", async (release, expectedStatus) => {
    mocks.release.mockResolvedValueOnce(release);
    const { handleChannelMessage } = await loadPipeline();

    const result = await handleChannelMessage(input());

    expect(result.ownershipRelease).toMatchObject({ status: expectedStatus });
    expect(result.channelTurnResult).toMatchObject({
      contractVersion: "channel-turn-result-v1",
      outcome: "completed_reconciliation_required",
      inboundPersistence: "persisted",
      retry: "reconcile_before_retry",
      reconciliationRequired: true,
    });
    expect(mocks.handleIncoming).toHaveBeenCalledTimes(1);
  });

  it("reports uncertain inbound persistence when a turn error is combined with uncertain release", async () => {
    mocks.handleIncoming.mockRejectedValueOnce(new Error("turn failed after persistence may have started"));
    mocks.release.mockResolvedValueOnce({ status: "uncertain", reason: "release_write_timeout" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handleChannelMessage } = await loadPipeline();

    try {
      await expect(handleChannelMessage(input())).rejects.toMatchObject({
        name: "ChannelTurnProcessingError",
        retryable: false,
        channelTurnResult: {
          contractVersion: "channel-turn-result-v1",
          outcome: "failed",
          inboundPersistence: "uncertain",
          ownership: "release_uncertain",
          retry: "reconcile_before_retry",
          reconciliationRequired: true,
          reason: "release_write_timeout",
        },
      });
    } finally {
      consoleSpy.mockRestore();
    }
    expect(mocks.getOrCreateConversation).not.toHaveBeenCalled();
    expect(mocks.updateConversation).not.toHaveBeenCalled();
  });

  it("reuses only a valid inherited context and never performs a nested acquisition", async () => {
    const inherited = canonicalGuard("inherited-operation");
    const { handleChannelMessage, runWithConversationOwnership } = await loadPipeline();

    await runWithConversationOwnership(
      { hotelId: "hotel-a", conversationId: "conversation-a", guard: inherited },
      () => handleChannelMessage(input()),
    );

    expect(mocks.acquire).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.handleIncoming).toHaveBeenCalledTimes(1);

    await expect(runWithConversationOwnership(
      { hotelId: "hotel-a", conversationId: "conversation-a", guard: inherited },
      () => handleChannelMessage(input({ conversationId: "conversation-b" })),
    )).rejects.toMatchObject({ ownershipStatus: "lost" });
    expect(mocks.handleIncoming).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConversation } from "@/lib/db/conversations";
import { handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";

const resolveGuestIdentityMock = vi.fn();

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: resolveGuestIdentityMock,
}));

describe("guest conversation binding (integration)", () => {
  beforeEach(() => {
    resolveGuestIdentityMock.mockReset();
    resolveGuestIdentityMock.mockResolvedValue({ guestId: "guest-canonical-1" });
  });

  it("reuses active conversation by hotelId + guestId across channels when conversationId is not explicit", async () => {
    const seeded = await createConversation({
      hotelId: "hotel-bind-1",
      channel: "whatsapp",
      lang: "es",
      guestId: "guest-canonical-1",
      status: "active",
    });

    const wa = await handleChannelMessage({
      hotelId: "hotel-bind-1",
      channel: "whatsapp",
      query: "hola",
      guestId: "+59811111111",
      sender: "guest",
    });

    const web = await handleChannelMessage({
      hotelId: "hotel-bind-1",
      channel: "web",
      query: "hola desde web",
      guestId: "web-abc",
      sender: "guest",
    });

    expect(wa.conversationId).toBe(seeded.conversationId);
    expect(web.conversationId).toBe(seeded.conversationId);
  }, 15000);

  it("prioritizes explicit conversationId over guest-based binding", async () => {
    const seeded = await createConversation({
      hotelId: "hotel-bind-2",
      channel: "whatsapp",
      lang: "es",
      guestId: "guest-canonical-1",
      status: "active",
    });

    const result = await handleChannelMessage({
      hotelId: "hotel-bind-2",
      channel: "web",
      query: "usar conversación explícita",
      conversationId: "conv-explicit-priority-1",
      guestId: "web-xyz",
      sender: "guest",
    });

    expect(seeded.conversationId).not.toBe("conv-explicit-priority-1");
    expect(result.conversationId).toBe("conv-explicit-priority-1");
  });
});

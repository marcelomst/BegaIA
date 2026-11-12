import { describe, expect, it, vi } from "vitest";

const { handleChannelMessageMock } = vi.hoisted(() => ({
  handleChannelMessageMock: vi.fn(),
}));

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  ChannelMessageInputError: class ChannelMessageInputError extends Error {},
  handleChannelMessage: handleChannelMessageMock,
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: vi.fn(async () => ({ guestId: "guest-rich-api" })),
}));

import { createGuestWebGrant, issueGuestConversationCapability } from "@/lib/auth/guestConversationCapability";
import { createConversation } from "@/lib/db/conversations";

function makeReq(body: unknown, capability: string): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${capability}` },
    body: JSON.stringify(body),
  });
}

describe("/api/chat rich payload", () => {
  it("propaga rich room-info-img en el JSON de respuesta", async () => {
    vi.stubEnv("GUEST_WEB_CONVERSATION_SECRET", "guest-rich-secret-with-at-least-32-bytes-1234567890");
    const jti = crypto.randomUUID();
    const webSubject = `ws_${crypto.randomUUID()}`;
    const grant = createGuestWebGrant({ webSubject, jti });
    const capability = await issueGuestConversationCapability({
      hotelId: "hotel999",
      conversationId: "conv-room-info-img-api-1",
      jti,
      grant,
    });
    await createConversation({
      hotelId: "hotel999",
      conversationId: "conv-room-info-img-api-1",
      channel: "web",
      lang: "es",
      guestId: "guest-rich-api",
      metadata: { guestWebGrant: grant },
    });
    handleChannelMessageMock.mockResolvedValueOnce({
      conversationId: "conv-room-info-img-api-1",
      status: "sent",
      response: "Estas son las habitaciones disponibles, con fotos y características principales.",
      suggestedReply: undefined,
      rich: {
        type: "room-info-img",
        data: [
          { type: "Single Standard", images: ["/hotel999/rooms/single/single.jpg"] },
          { type: "Doble", images: ["/hotel999/rooms/double/double.jpg"] },
          { type: "Twin", images: ["/hotel999/rooms/twin/twin.jpg"] },
          { type: "Triple", images: ["/hotel999/rooms/triple/hab-triple-1.jpg"] },
        ],
      },
      lang: "es",
      hotelId: "hotel999",
      channel: "web",
      messageId: "msg-room-info-img-api-1",
    });

    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(
      makeReq({
        hotelId: "hotel999",
        conversationId: "conv-room-info-img-api-1",
        channel: "web",
        query: "Que tipos de habitaciones tienen?",
        messageId: crypto.randomUUID(),
      }, capability)
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rich?.type).toBe("room-info-img");
    expect(json.rich?.data).toHaveLength(4);
    expect(json.rich.data.map((item: any) => item.type)).toEqual([
      "Single Standard",
      "Doble",
      "Twin",
      "Triple",
    ]);
    expect(json.rich.data.map((item: any) => item.images?.[0])).toEqual([
      "/hotel999/rooms/single/single.jpg",
      "/hotel999/rooms/double/double.jpg",
      "/hotel999/rooms/twin/twin.jpg",
      "/hotel999/rooms/triple/hab-triple-1.jpg",
    ]);
  });
});

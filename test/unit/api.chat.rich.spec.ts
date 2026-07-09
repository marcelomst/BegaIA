import { describe, expect, it, vi } from "vitest";

const { handleChannelMessageMock } = vi.hoisted(() => ({
  handleChannelMessageMock: vi.fn(),
}));

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  ChannelMessageInputError: class ChannelMessageInputError extends Error {},
  handleChannelMessage: handleChannelMessageMock,
}));

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/chat rich payload", () => {
  it("propaga rich room-info-img en el JSON de respuesta", async () => {
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
        channel: "web",
        query: "Que tipos de habitaciones tienen?",
        conversationId: "conv-room-info-img-api-1",
        guestId: "guest-room-info-img-api-1",
      })
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

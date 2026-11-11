// Path: /root/begasist/test/integration/api_messages_by-conversation.test.ts
import { beforeEach, describe, it, expect, vi } from "vitest";
import { GET as byConvGET } from "@/app/api/messages/by-conversation/route";
import { getCollection } from "../mocks/astra";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function makeReq(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/messages/by-conversation?${sp.toString()}`, {
    method: "GET",
  }) as any;
}

describe("/api/messages/by-conversation (integration)", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "staff-a",
      email: "staff-a@example.com",
      hotelId: "hotel999",
      hotelName: "Hotel 999",
      roleLevel: 10,
    });
  });

  it("lista mensajes ordenados por timestamp asc", async () => {
    const col = getCollection("messages");
    await getCollection("conversations").insertOne({
      hotelId: "hotel999",
      channel: "web",
      conversationId: "conv-1",
      guestId: "guest-1",
    });
    await col.insertOne({ hotelId: "hotel999", channel: "web", conversationId: "conv-1", messageId: "m1", timestamp: 1 });
    await col.insertOne({ hotelId: "hotel999", channel: "web", conversationId: "conv-1", messageId: "m2", timestamp: 2 });

    // algunas implementaciones piden 'channelId', otras 'channel' o 'hotelId'
    const r = await byConvGET(makeReq({ channelId: "web", channel: "web", hotelId: "hotel999", conversationId: "conv-1" }));
    expect(r.ok).toBe(true);
    const json = await r.json();
    const list = (json.messages ?? json.data?.messages) as any[];
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].messageId).toBe("m1");
    expect(list[1].messageId).toBe("m2");
  });

  it("rechaza request público sin autoridad", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    const r = await byConvGET(makeReq({
      channelId: "web",
      hotelId: "hotel999",
      conversationId: "conv-public-denied",
    }));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "No autorizado" });
  });

  it("rechaza JWT válido que manipula hotelId sin consultar datos foreign", async () => {
    await getCollection("conversations").insertOne({
      hotelId: "hotel-b",
      channel: "web",
      conversationId: "conv-hotel-b-secret",
      guestId: "guest-b",
    });
    await getCollection("messages").insertOne({
      _id: "message-hotel-b-secret",
      messageId: "message-hotel-b-secret",
      hotelId: "hotel-b",
      channel: "web",
      conversationId: "conv-hotel-b-secret",
      content: "foreign secret",
    });

    const r = await byConvGET(makeReq({
      channelId: "web",
      hotelId: "hotel-b",
      conversationId: "conv-hotel-b-secret",
      guestId: "guest-b",
    }));
    expect(r.status).toBe(403);
    expect(JSON.stringify(await r.json())).not.toContain("foreign secret");
  });

  it("no usa guestId aportado por cliente como autoridad", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      userId: "guest-b",
      email: "guest@example.com",
      hotelId: "hotel999",
      hotelName: "Hotel 999",
      roleLevel: 30,
    });
    const r = await byConvGET(makeReq({
      channelId: "web",
      hotelId: "hotel999",
      conversationId: "conv-1",
      guestId: "guest-1",
    }));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "No autorizado" });
  });
});

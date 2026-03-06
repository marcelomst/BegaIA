import { describe, it, expect } from "vitest";
import { GET as adminConversationsGET } from "@/app/api/admin/conversations/route";
import { getCollection } from "../mocks/astra";

function makeReq(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/admin/conversations?${sp.toString()}`, {
    method: "GET",
  }) as any;
}

describe("/api/admin/conversations (integration)", () => {
  it("returns unified conversations by guestId with lastMessage", async () => {
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await convCol.insertOne({
      conversationId: "conv-g-1",
      hotelId: "hotel999",
      channel: "web",
      guestId: "guest-1",
      startedAt: "2026-03-06T10:00:00.000Z",
      lastUpdatedAt: "2026-03-06T10:01:00.000Z",
      lang: "es",
      status: "active",
      subject: "Web thread",
    });

    await convCol.insertOne({
      conversationId: "conv-g-2",
      hotelId: "hotel999",
      channel: "whatsapp",
      guestId: "guest-1",
      startedAt: "2026-03-06T10:02:00.000Z",
      lastUpdatedAt: "2026-03-06T10:03:00.000Z",
      lang: "es",
      status: "active",
      subject: "WA thread",
    });

    await msgCol.insertOne({
      _id: "m-g-1",
      messageId: "m-g-1",
      hotelId: "hotel999",
      conversationId: "conv-g-1",
      channel: "web",
      content: "hola web",
      timestamp: "2026-03-06T10:01:00.000Z",
    });

    await msgCol.insertOne({
      _id: "m-g-2",
      messageId: "m-g-2",
      hotelId: "hotel999",
      conversationId: "conv-g-2",
      channel: "whatsapp",
      suggestion: "hola wa",
      timestamp: "2026-03-06T10:03:00.000Z",
    });

    const r = await adminConversationsGET(makeReq({ hotelId: "hotel999", guestId: "guest-1" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.guestId).toBe("guest-1");
    expect(Array.isArray(json.conversations)).toBe(true);
    expect(json.conversations.length).toBeGreaterThanOrEqual(2);

    const wa = json.conversations.find((c: any) => c.conversationId === "conv-g-2");
    const web = json.conversations.find((c: any) => c.conversationId === "conv-g-1");

    expect(wa?.channel).toBe("whatsapp");
    expect(wa?.lastMessage).toBe("hola wa");
    expect(web?.channel).toBe("web");
    expect(web?.lastMessage).toBe("hola web");
  });

  it("keeps compatibility for explicit conversationId query", async () => {
    const convCol = getCollection("conversations");

    await convCol.insertOne({
      conversationId: "conv-explicit-1",
      hotelId: "hotel999",
      channel: "email",
      guestId: "guest-explicit",
      startedAt: "2026-03-06T11:00:00.000Z",
      lastUpdatedAt: "2026-03-06T11:01:00.000Z",
      lang: "es",
      status: "active",
      subject: "Email thread",
    });

    const r = await adminConversationsGET(
      makeReq({ hotelId: "hotel999", conversationId: "conv-explicit-1" }),
    );
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.guestId).toBe("guest-explicit");
    expect(json.conversations?.[0]?.conversationId).toBe("conv-explicit-1");
  });
});

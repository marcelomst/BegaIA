import { describe, it, expect, vi } from "vitest";
import { GET as adminConversationsGET } from "@/app/api/admin/conversations/route";
import { getCollection } from "../mocks/astra";
import * as guestAliasesDb from "@/lib/db/guestAliases";

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

  it("filters conversations by channel when channel query param is present", async () => {
    const convCol = getCollection("conversations");
    const hotelId = "hotel-filter-channel";

    await convCol.insertOne({
      conversationId: "conv-email-only",
      hotelId,
      channel: "email",
      guestId: "guest-email-1",
      startedAt: "2026-03-06T11:10:00.000Z",
      lastUpdatedAt: "2026-03-06T11:11:00.000Z",
      lang: "es",
      status: "active",
      subject: "Email thread",
    });

    await convCol.insertOne({
      conversationId: "conv-web-only",
      hotelId,
      channel: "web",
      guestId: "guest-web-1",
      startedAt: "2026-03-06T11:12:00.000Z",
      lastUpdatedAt: "2026-03-06T11:13:00.000Z",
      lang: "es",
      status: "active",
      subject: "Web thread",
    });

    const r = await adminConversationsGET(makeReq({ hotelId, channel: "email" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(Array.isArray(json.conversations)).toBe(true);
    expect(json.conversations.length).toBe(1);
    expect(json.conversations[0]?.conversationId).toBe("conv-email-only");
    expect(json.conversations[0]?.channel).toBe("email");
  });

  it("resolves guest conversations through aliases from the canonical guest perspective", async () => {
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-canonical-1",
      alias: "whatsapp:+59811111111",
      createdat: "2026-03-06T12:00:00.000Z",
    });

    await convCol.insertOne({
      conversationId: "conv-alias-1",
      hotelId: "hotel999",
      channel: "whatsapp",
      guestId: "whatsapp:+59811111111",
      startedAt: "2026-03-06T12:00:00.000Z",
      lastUpdatedAt: "2026-03-06T12:05:00.000Z",
      lang: "es",
      status: "active",
      subject: "Alias thread",
    });

    await msgCol.insertOne({
      _id: "m-alias-1",
      messageId: "m-alias-1",
      hotelId: "hotel999",
      conversationId: "conv-alias-1",
      channel: "whatsapp",
      content: "hola alias",
      timestamp: "2026-03-06T12:05:00.000Z",
    });

    const r = await adminConversationsGET(
      makeReq({ hotelId: "hotel999", guestId: "guest-canonical-1" }),
    );
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.guestId).toBe("guest-canonical-1");
    expect(json.conversations).toHaveLength(1);
    expect(json.conversations[0]?.conversationId).toBe("conv-alias-1");
    expect(json.conversations[0]?.guestId).toBe("whatsapp:+59811111111");
    expect(json.conversations[0]?.lastMessage).toBe("hola alias");
  });

  it("uses embedded guest identifiers when guest_aliases_by_guest fails", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await guestCol.insertOne({
      guestId: "guest-canonical-embedded-1",
      hotelId: "hotel999",
      name: "Marcelo Martinez",
      createdAt: "2026-03-06T12:30:00.000Z",
      updatedAt: "2026-03-06T12:31:00.000Z",
      mode: "automatic",
      identifiers: {
        whatsappId: "+59833333333",
      },
    });

    await convCol.insertOne({
      conversationId: "conv-embedded-1",
      hotelId: "hotel999",
      channel: "whatsapp",
      guestId: "whatsapp:+59833333333",
      startedAt: "2026-03-06T12:32:00.000Z",
      lastUpdatedAt: "2026-03-06T12:35:00.000Z",
      lang: "es",
      status: "active",
    });

    await msgCol.insertOne({
      _id: "m-embedded-1",
      messageId: "m-embedded-1",
      hotelId: "hotel999",
      conversationId: "conv-embedded-1",
      channel: "whatsapp",
      content: "hola embedded",
      timestamp: "2026-03-06T12:35:00.000Z",
    });

    const aliasSpy = vi
      .spyOn(guestAliasesDb, "getGuestAliasesByGuestId")
      .mockRejectedValueOnce(new Error("metadata unavailable"));

    const r = await adminConversationsGET(
      makeReq({ hotelId: "hotel999", guestId: "guest-canonical-embedded-1" }),
    );
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.conversations).toHaveLength(1);
    expect(json.conversations[0]?.conversationId).toBe("conv-embedded-1");
    expect(json.conversations[0]?.lastMessage).toBe("hola embedded");

    aliasSpy.mockRestore();
  });
});

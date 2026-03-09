// Path: /root/begasist/test/integration/api_admin_guests_merge.test.ts
import { describe, expect, it } from "vitest";
import { POST as mergeGuestsPOST } from "@/app/api/admin/guests/merge/route";
import { getCollection } from "../mocks/astra";

function makeReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/guests/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("/api/admin/guests/merge (integration)", () => {
  it("mergea aliases y referencias de conversaciones/mensajes al guest primario", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");
    const convCol = getCollection("conversations");
    const msgCol = getCollection("messages");

    await guestCol.insertOne({
      guestId: "guest-primary-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T10:00:00.000Z",
      updatedAt: "2026-03-09T10:00:00.000Z",
      mode: "automatic",
      aliases: ["whatsapp:+59811111111"],
    });
    await guestCol.insertOne({
      guestId: "guest-secondary-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T10:01:00.000Z",
      updatedAt: "2026-03-09T10:01:00.000Z",
      mode: "automatic",
      aliases: ["web:session_xyz"],
    });

    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "whatsapp:+59811111111",
      guestid: "guest-primary-1",
      createdat: "2026-03-09T10:00:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-primary-1",
      alias: "whatsapp:+59811111111",
      createdat: "2026-03-09T10:00:00.000Z",
    });

    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "web:session_xyz",
      guestid: "guest-secondary-1",
      createdat: "2026-03-09T10:01:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-secondary-1",
      alias: "web:session_xyz",
      createdat: "2026-03-09T10:01:00.000Z",
    });

    await convCol.insertOne({
      conversationId: "conv-merge-1",
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
      channel: "web",
      startedAt: "2026-03-09T10:02:00.000Z",
      lastUpdatedAt: "2026-03-09T10:02:00.000Z",
      lang: "es",
      status: "active",
    });
    await msgCol.insertOne({
      _id: "msg-merge-1",
      messageId: "msg-merge-1",
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
      conversationId: "conv-merge-1",
      channel: "web",
      role: "user",
      content: "hola",
      timestamp: "2026-03-09T10:02:10.000Z",
    });

    const r = await mergeGuestsPOST(
      makeReq({
        hotelId: "hotel999",
        primaryGuestId: "guest-primary-1",
        secondaryGuestId: "guest-secondary-1",
        mergedBy: "qa@begasist",
      }),
    );

    expect(r.ok).toBe(true);
    const json = await r.json();
    expect(json.ok).toBe(true);
    expect(json.result.primaryGuestId).toBe("guest-primary-1");
    expect(json.result.secondaryGuestId).toBe("guest-secondary-1");
    expect(json.result.movedAliases).toBe(1);

    const aliasMoved = await aliasCol.findOne({
      hotelid: "hotel999",
      alias: "web:session_xyz",
    });
    expect(aliasMoved?.guestid).toBe("guest-primary-1");

    const convMoved = await convCol.findOne({ conversationId: "conv-merge-1" });
    expect(convMoved?.guestId).toBe("guest-primary-1");

    const msgMoved = await msgCol.findOne({ _id: "msg-merge-1" });
    expect(msgMoved?.guestId).toBe("guest-primary-1");

    const secondaryGuest = await guestCol.findOne({
      hotelId: "hotel999",
      guestId: "guest-secondary-1",
    });
    const tags = Array.isArray(secondaryGuest?.tags) ? secondaryGuest.tags : [];
    expect(tags).toEqual(expect.arrayContaining(["merged", "merged-into:guest-primary-1"]));
  });
});

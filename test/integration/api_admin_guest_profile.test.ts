import { describe, expect, it } from "vitest";
import { GET as adminGuestProfileGET } from "@/app/api/admin/guest-profile/route";
import { getCollection } from "../mocks/astra";

function makeReq(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/admin/guest-profile?${sp.toString()}`, {
    method: "GET",
  }) as any;
}

describe("/api/admin/guest-profile (integration)", () => {
  it("devuelve guest + aliases + métricas de conversaciones", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");
    const convCol = getCollection("conversations");

    await guestCol.insertOne({
      guestId: "guest-123",
      hotelId: "hotel999",
      createdAt: "2026-03-06T09:00:00.000Z",
      updatedAt: "2026-03-06T09:05:00.000Z",
      mode: "automatic",
    });

    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "whatsapp:+59811111111",
      guestid: "guest-123",
      createdat: "2026-03-06T09:01:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-123",
      alias: "whatsapp:+59811111111",
      createdat: "2026-03-06T09:01:00.000Z",
    });
    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "email:john@example.com",
      guestid: "guest-123",
      createdat: "2026-03-06T09:02:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-123",
      alias: "email:john@example.com",
      createdat: "2026-03-06T09:02:00.000Z",
    });

    await convCol.insertOne({
      conversationId: "conv-1",
      hotelId: "hotel999",
      channel: "web",
      guestId: "guest-123",
      startedAt: "2026-03-06T09:30:00.000Z",
      lastUpdatedAt: "2026-03-06T09:40:00.000Z",
      lang: "es",
      status: "active",
    });
    await convCol.insertOne({
      conversationId: "conv-2",
      hotelId: "hotel999",
      channel: "whatsapp",
      guestId: "guest-123",
      startedAt: "2026-03-06T09:50:00.000Z",
      lastUpdatedAt: "2026-03-06T10:03:00.000Z",
      lang: "es",
      status: "active",
    });

    const r = await adminGuestProfileGET(makeReq({ hotelId: "hotel999", guestId: "guest-123" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.guestId).toBe("guest-123");
    expect(json.guest?.guestId).toBe("guest-123");
    expect(json.aliases).toEqual(["whatsapp:+59811111111", "email:john@example.com"]);
    expect(json.conversationCount).toBe(2);
    expect(json.lastActivityAt).toBe("2026-03-06T10:03:00.000Z");
    expect(json.channels).toEqual(expect.arrayContaining(["whatsapp", "email", "web"]));
  });

  it("deriva channels desde aliases aun sin conversaciones", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const aliasByGuestCol = getCollection("guest_aliases_by_guest");

    await guestCol.insertOne({
      guestId: "guest-chan",
      hotelId: "hotel999",
      createdAt: "2026-03-06T08:00:00.000Z",
      updatedAt: "2026-03-06T08:10:00.000Z",
      mode: "supervised",
    });

    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "web:session_abc",
      guestid: "guest-chan",
      createdat: "2026-03-06T08:01:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-chan",
      alias: "web:session_abc",
      createdat: "2026-03-06T08:01:00.000Z",
    });
    await aliasCol.insertOne({
      hotelid: "hotel999",
      alias: "email:chan@example.com",
      guestid: "guest-chan",
      createdat: "2026-03-06T08:02:00.000Z",
    });
    await aliasByGuestCol.insertOne({
      hotelid: "hotel999",
      guestid: "guest-chan",
      alias: "email:chan@example.com",
      createdat: "2026-03-06T08:02:00.000Z",
    });

    const r = await adminGuestProfileGET(makeReq({ hotelId: "hotel999", guestId: "guest-chan" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.channels).toEqual(expect.arrayContaining(["web", "email"]));
    expect(json.conversationCount).toBe(0);
    expect(json.lastActivityAt).toBeNull();
  });

  it("maneja guest inexistente sin romper", async () => {
    const r = await adminGuestProfileGET(makeReq({ hotelId: "hotel999", guestId: "guest-missing" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    expect(json.guestId).toBe("guest-missing");
    expect(json.guest).toBeNull();
    expect(json.aliases).toEqual([]);
    expect(json.channels).toEqual([]);
    expect(json.conversationCount).toBe(0);
    expect(json.lastActivityAt).toBeNull();
  });
});

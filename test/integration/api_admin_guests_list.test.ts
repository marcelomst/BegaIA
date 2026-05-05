// Path: /root/begasist/test/integration/api_admin_guests_list.test.ts
import { describe, expect, it, vi } from "vitest";
import { GET as adminGuestsGET } from "@/app/api/admin/guests/route";
import { getCollection } from "../mocks/astra";
import * as conversationsDb from "@/lib/db/conversations";
import * as guestsDb from "@/lib/db/guests";

function makeReq(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/admin/guests?${sp.toString()}`, {
    method: "GET",
  }) as any;
}

describe("/api/admin/guests (integration)", () => {
  it("excluye guests absorbidos por defecto y permite incluirlos bajo flag", async () => {
    const guestCol = getCollection("guests");

    await guestCol.insertOne({
      guestId: "guest-visible-1",
      hotelId: "hotel999",
      name: "Guest Visible",
      createdAt: "2026-03-09T10:00:00.000Z",
      updatedAt: "2026-03-09T10:00:00.000Z",
      tags: [],
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-absorbed-1",
      hotelId: "hotel999",
      name: "Guest Absorbed",
      createdAt: "2026-03-09T10:01:00.000Z",
      updatedAt: "2026-03-09T10:01:00.000Z",
      tags: ["merged"],
      mode: "automatic",
    });

    const r1 = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r1.ok).toBe(true);
    const j1 = await r1.json();
    const guestIdsDefault = Array.isArray(j1?.guests) ? j1.guests.map((g: any) => g.guestId) : [];
    expect(guestIdsDefault).toContain("guest-visible-1");
    expect(guestIdsDefault).not.toContain("guest-absorbed-1");

    const r2 = await adminGuestsGET(makeReq({ hotelId: "hotel999", includeAbsorbed: "1" }));
    expect(r2.ok).toBe(true);
    const j2 = await r2.json();
    const rows = Array.isArray(j2?.guests) ? j2.guests : [];
    const absorbedRow = rows.find((g: any) => g.guestId === "guest-absorbed-1");
    expect(absorbedRow).toBeTruthy();
    expect(absorbedRow.absorbed).toBe(true);
  });

  it("asocia conversaciones históricas guardadas bajo aliases al guest canónico", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");

    await guestCol.insertOne({
      guestId: "guest-admin-1",
      hotelId: "hotel999",
      name: "Marcelo Martinez",
      createdAt: "2026-03-09T11:00:00.000Z",
      updatedAt: "2026-03-09T11:00:00.000Z",
      tags: [],
      mode: "automatic",
      aliases: ["whatsapp:+59822222222"],
    });

    await convCol.insertOne({
      conversationId: "conv-admin-1",
      hotelId: "hotel999",
      channel: "whatsapp",
      guestId: "whatsapp:+59822222222",
      startedAt: "2026-03-09T11:05:00.000Z",
      lastUpdatedAt: "2026-03-09T11:20:00.000Z",
      lang: "es",
      status: "active",
    });

    const r = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    const row = Array.isArray(json?.guests)
      ? json.guests.find((guest: any) => guest.guestId === "guest-admin-1")
      : null;

    expect(row).toBeTruthy();
    expect(row.conversationCount).toBe(1);
    expect(row.lastActivityAt).toBe("2026-03-09T11:20:00.000Z");
    expect(row.channels).toEqual(expect.arrayContaining(["whatsapp"]));
  });

  it("degrada a 200 cuando falla la carga de aliases o conversaciones del read-path admin", async () => {
    const guestCol = getCollection("guests");

    await guestCol.insertOne({
      guestId: "guest-safe-1",
      hotelId: "hotel999",
      name: "Guest Safe",
      createdAt: "2026-03-09T12:00:00.000Z",
      updatedAt: "2026-03-09T12:00:00.000Z",
      tags: [],
      mode: "automatic",
      aliases: ["web:session_safe"],
    });

    const convSpy = vi
      .spyOn(conversationsDb, "getAllConversationsForHotel")
      .mockRejectedValueOnce(new Error("astra unavailable"));

    const r = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    const row = Array.isArray(json?.guests)
      ? json.guests.find((guest: any) => guest.guestId === "guest-safe-1")
      : null;

    expect(row).toBeTruthy();
    expect(row.aliases).toEqual(["web:session_safe"]);
    expect(row.conversationCount).toBe(0);
    expect(row.lastActivityAt).toBeNull();

    convSpy.mockRestore();
  });

  it("mantiene asociación por guestId directo sin depender de guest_aliases_by_guest", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");

    await guestCol.insertOne({
      guestId: "guest-direct-1",
      hotelId: "hotel999",
      name: "Guest Direct",
      createdAt: "2026-03-09T13:00:00.000Z",
      updatedAt: "2026-03-09T13:00:00.000Z",
      tags: [],
      mode: "automatic",
    });

    await convCol.insertOne({
      conversationId: "conv-direct-1",
      hotelId: "hotel999",
      channel: "web",
      guestId: "guest-direct-1",
      startedAt: "2026-03-09T13:05:00.000Z",
      lastUpdatedAt: "2026-03-09T13:10:00.000Z",
      lang: "es",
      status: "active",
    });

    const r = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    const row = Array.isArray(json?.guests)
      ? json.guests.find((guest: any) => guest.guestId === "guest-direct-1")
      : null;

    expect(row).toBeTruthy();
    expect(row.conversationCount).toBe(1);
    expect(row.lastActivityAt).toBe("2026-03-09T13:10:00.000Z");
    expect(row.channels).toEqual(expect.arrayContaining(["web"]));
  });

  it("responde rápido con filas mínimas aunque la carga de conversaciones no resuelva", async () => {
    const guestCol = getCollection("guests");

    await guestCol.insertOne({
      guestId: "guest-minimal-1",
      hotelId: "hotel999",
      name: "Guest Minimal",
      createdAt: "2026-03-09T14:00:00.000Z",
      updatedAt: "2026-03-09T14:00:00.000Z",
      tags: [],
      mode: "automatic",
    });

    const convSpy = vi
      .spyOn(conversationsDb, "getAllConversationsForHotel")
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("slow conversations source")), 3500);
          }) as any,
      );

    const r = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    const row = Array.isArray(json?.guests)
      ? json.guests.find((guest: any) => guest.guestId === "guest-minimal-1")
      : null;

    expect(row).toBeTruthy();
    expect(row.conversationCount).toBe(0);
    expect(row.lastActivityAt).toBeNull();
    expect(row.channels).toEqual([]);

    convSpy.mockRestore();
  });

  it("reconstruye guests mínimos desde conversations cuando la colección guests está vacía", async () => {
    const convCol = getCollection("conversations");

    await convCol.insertOne({
      conversationId: "conv-fallback-guest-1",
      hotelId: "hotel999",
      channel: "whatsapp",
      guestId: "whatsapp:+59844444444",
      startedAt: "2026-03-09T15:00:00.000Z",
      lastUpdatedAt: "2026-03-09T15:10:00.000Z",
      lang: "es",
      status: "active",
    });

    const guestsSpy = vi
      .spyOn(guestsDb, "findGuestsByHotel")
      .mockResolvedValueOnce([]);

    const r = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    const row = Array.isArray(json?.guests)
      ? json.guests.find((guest: any) => guest.guestId === "whatsapp:+59844444444")
      : null;

    expect(row).toBeTruthy();
    expect(row.aliases).toEqual(expect.arrayContaining(["whatsapp:+59844444444"]));
    expect(row.conversationCount).toBe(1);
    expect(row.lastActivityAt).toBe("2026-03-09T15:10:00.000Z");
    expect(row.channels).toEqual(expect.arrayContaining(["whatsapp"]));

    guestsSpy.mockRestore();
  });

  it("prioriza name, mode y aliases del documento real cuando hay filas mínimas o duplicadas", async () => {
    const guestCol = getCollection("guests");
    const convCol = getCollection("conversations");

    await guestCol.insertOne({
      guestId: "guest-rich-1",
      hotelId: "hotel999",
      createdAt: "2026-03-09T16:00:00.000Z",
      updatedAt: "2026-03-09T16:01:00.000Z",
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-rich-1",
      hotelId: "hotel999",
      name: "Marcelo",
      aliases: ["web:guest-rich-1"],
      createdAt: "2026-03-09T16:02:00.000Z",
      updatedAt: "2026-03-09T16:03:00.000Z",
      mode: "automatic",
    });

    await convCol.insertOne({
      conversationId: "conv-rich-1",
      hotelId: "hotel999",
      channel: "web",
      guestId: "guest-rich-1",
      startedAt: "2026-03-09T16:05:00.000Z",
      lastUpdatedAt: "2026-03-09T16:06:00.000Z",
      lang: "es",
      status: "active",
    });

    const r = await adminGuestsGET(makeReq({ hotelId: "hotel999" }));
    expect(r.ok).toBe(true);

    const json = await r.json();
    const row = Array.isArray(json?.guests)
      ? json.guests.find((guest: any) => guest.guestId === "guest-rich-1")
      : null;

    expect(row).toBeTruthy();
    expect(row.name).toBe("Marcelo");
    expect(row.mode).toBe("automatic");
    expect(row.aliases).toEqual(expect.arrayContaining(["web:guest-rich-1"]));
    expect(row.conversationCount).toBe(1);
  });
});

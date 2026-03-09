// Path: /root/begasist/test/integration/api_admin_guests_list.test.ts
import { describe, expect, it } from "vitest";
import { GET as adminGuestsGET } from "@/app/api/admin/guests/route";
import { getCollection } from "../mocks/astra";

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
});

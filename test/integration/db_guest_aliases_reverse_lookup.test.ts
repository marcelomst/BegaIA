import { describe, expect, it } from "vitest";
import {
  ensureGuestAlias,
  getGuestAliasesByGuestId,
  getGuestIdByAlias,
} from "@/lib/db/guestAliases";
import { getCollection } from "../mocks/astra";

describe("guestAliases reverse lookup read model", () => {
  it("escribe alias en ambas tablas al crear mapping nuevo", async () => {
    const hotelId = "hotel-rev-1";
    const guestId = "guest-rev-1";
    const alias = "email:reverse1@example.com";

    const out = await ensureGuestAlias({
      hotelId,
      alias,
      preferredGuestId: guestId,
    });

    expect(out.guestId).toBe(guestId);
    expect(out.created).toBe(true);

    const direct = await getCollection("guest_aliases").findOne({
      hotelid: hotelId,
      alias,
    });
    const reverse = await getCollection("guest_aliases_by_guest").findOne({
      hotelid: hotelId,
      guestid: guestId,
      alias,
    });

    expect(direct?.guestid).toBe(guestId);
    expect(reverse?.guestid).toBe(guestId);
  });

  it("reverse lookup usa tabla por guestId y no depende de guest_aliases principal", async () => {
    const hotelId = "hotel-rev-2";
    const guestId = "guest-rev-2";
    const alias = "web:session_xyz";

    await getCollection("guest_aliases_by_guest").insertOne({
      hotelid: hotelId,
      guestid: guestId,
      alias,
      createdat: "2026-03-07T11:00:00.000Z",
    });

    const rows = await getGuestAliasesByGuestId({ hotelId, guestId });
    expect(rows.map((r) => r.alias)).toContain(alias);
  });

  it("mantiene lookup principal alias -> guestId", async () => {
    const hotelId = "hotel-rev-3";
    const guestId = "guest-rev-3";
    const alias = "whatsapp:+59822222222";

    await ensureGuestAlias({
      hotelId,
      alias,
      preferredGuestId: guestId,
    });

    const resolved = await getGuestIdByAlias({ hotelId, alias });
    expect(resolved).toBe(guestId);
  });
});

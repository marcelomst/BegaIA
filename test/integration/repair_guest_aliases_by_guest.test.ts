// Path: /root/begasist/test/integration/repair_guest_aliases_by_guest.test.ts
import { describe, expect, it } from "vitest";
import { repairGuestAliasesByGuest } from "@/scripts/repair-guest-aliases-by-guest";
import { getCollection } from "../mocks/astra";

describe("repairGuestAliasesByGuest", () => {
  it("reconstruye la proyección inversa desde guests.aliases sin modificar fuentes canónicas", async () => {
    const guestCol = getCollection("guests");
    const aliasCol = getCollection("guest_aliases");
    const reverseCol = getCollection("guest_aliases_by_guest");

    await guestCol.insertOne({
      guestId: "guest-repair-active-1",
      hotelId: "hotel-repair-1",
      aliases: ["web:repair-1", "email:repair@example.com", "whatsapp:+59844444444"],
      createdAt: "2026-03-10T10:00:00.000Z",
      updatedAt: "2026-03-10T10:00:00.000Z",
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-repair-other-1",
      hotelId: "hotel-repair-1",
      aliases: [],
      createdAt: "2026-03-10T10:01:00.000Z",
      updatedAt: "2026-03-10T10:01:00.000Z",
      mode: "automatic",
    });
    await guestCol.insertOne({
      guestId: "guest-repair-absorbed-1",
      hotelId: "hotel-repair-1",
      aliases: ["web:absorbed-repair-1"],
      tags: ["merged", "merged-into:guest-repair-active-1"],
      createdAt: "2026-03-10T10:02:00.000Z",
      updatedAt: "2026-03-10T10:02:00.000Z",
      mode: "automatic",
    });

    await aliasCol.insertOne({
      hotelid: "hotel-repair-1",
      alias: "web:repair-1",
      guestid: "guest-repair-active-1",
      createdat: "2026-03-10T10:00:00.000Z",
    });
    await aliasCol.insertOne({
      hotelid: "hotel-repair-1",
      alias: "email:repair@example.com",
      guestid: "guest-repair-active-1",
      createdat: "2026-03-10T10:00:00.000Z",
    });
    await aliasCol.insertOne({
      hotelid: "hotel-repair-1",
      alias: "whatsapp:+59844444444",
      guestid: "guest-repair-other-1",
      createdat: "2026-03-10T10:00:00.000Z",
    });
    await aliasCol.insertOne({
      hotelid: "hotel-repair-1",
      alias: "web:absorbed-repair-1",
      guestid: "guest-repair-absorbed-1",
      createdat: "2026-03-10T10:02:00.000Z",
    });

    await reverseCol.insertOne({
      hotelid: "hotel-repair-1",
      guestid: "guest-repair-active-1",
      alias: "web:repair-1",
      createdat: "2026-03-10T10:00:00.000Z",
    });
    await reverseCol.insertOne({
      hotelid: "hotel-repair-1",
      guestid: "guest-repair-active-1",
      alias: "web:stale-repair-1",
      createdat: "2026-03-10T10:00:00.000Z",
    });
    await reverseCol.insertOne({
      hotelid: "hotel-repair-1",
      guestid: "guest-repair-absorbed-1",
      alias: "web:absorbed-repair-1",
      createdat: "2026-03-10T10:02:00.000Z",
    });

    const dryRun = await repairGuestAliasesByGuest({ hotelId: "hotel-repair-1" });
    expect(dryRun.apply).toBe(false);
    expect(dryRun.reverseRowsInserted).toBe(1);
    expect(dryRun.reverseRowsRemoved).toBe(2);
    expect(dryRun.canonicalContradictions).toBeGreaterThanOrEqual(1);
    expect(dryRun.absorbedGuestAliases).toBeGreaterThanOrEqual(1);

    await expect(
      reverseCol.findOne({
        hotelid: "hotel-repair-1",
        guestid: "guest-repair-active-1",
        alias: "email:repair@example.com",
      }),
    ).resolves.toBeNull();

    const applied = await repairGuestAliasesByGuest({ hotelId: "hotel-repair-1", apply: true });
    expect(applied.reverseRowsInserted).toBe(1);
    expect(applied.reverseRowsRemoved).toBe(2);

    await expect(
      reverseCol.findOne({
        hotelid: "hotel-repair-1",
        guestid: "guest-repair-active-1",
        alias: "email:repair@example.com",
      }),
    ).resolves.toBeTruthy();
    await expect(
      reverseCol.findOne({
        hotelid: "hotel-repair-1",
        guestid: "guest-repair-active-1",
        alias: "web:stale-repair-1",
      }),
    ).resolves.toBeNull();
    await expect(
      reverseCol.findOne({
        hotelid: "hotel-repair-1",
        guestid: "guest-repair-absorbed-1",
        alias: "web:absorbed-repair-1",
      }),
    ).resolves.toBeNull();
    await expect(
      aliasCol.findOne({
        hotelid: "hotel-repair-1",
        alias: "web:repair-1",
      }),
    ).resolves.toEqual(expect.objectContaining({ guestid: "guest-repair-active-1" }));

    const secondApply = await repairGuestAliasesByGuest({ hotelId: "hotel-repair-1", apply: true });
    expect(secondApply.reverseRowsInserted).toBe(0);
    expect(secondApply.reverseRowsRemoved).toBe(0);
  });
});

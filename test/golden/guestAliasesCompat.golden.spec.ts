// Path: /root/begasist/test/golden/guestAliasesCompat.golden.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const insertOneMock = vi.fn(async () => ({}));

vi.mock("@/lib/db/guestAliases", () => {
  return {
    getGuestIdByAlias: async () => null,
    ensureGuestAlias: async () => ({
      guestId: "guest-new",
      created: true,
    }),
  };
});

vi.mock("@/lib/db/guests", () => {
  return {
    getGuest: async () => ({
      guestId: "whatsapp:+59899123456",
    }),
  };
});

vi.mock("@/lib/astra/connection", () => {
  return {
    getAstraDB: () => ({
      collection: () => ({
        insertOne: insertOneMock,
      }),
    }),
  };
});

import { resolveGuestIdentity } from "@/lib/pipeline/resolveGuestIdentity";

describe("golden • guest aliases legacy compat", () => {
  beforeEach(() => {
    insertOneMock.mockClear();
  });

  it("returns legacy guestId and backfills alias", async () => {
    const result = await resolveGuestIdentity({
      hotelId: "hotel-test",
      channel: "whatsapp",
      rawGuestId: "whatsapp:+59899123456",
    });

    expect(result.guestId).toBe("whatsapp:+59899123456");
    expect(result.guestAlias).toBe("whatsapp:+59899123456");
    expect(insertOneMock).toHaveBeenCalledTimes(1);
  });
});

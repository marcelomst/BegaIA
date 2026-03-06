// Path: /root/begasist/test/golden/guestAliasesCompat.golden.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const { ensureGuestAliasMock } = vi.hoisted(() => ({
  ensureGuestAliasMock: vi.fn(async () => ({
    guestId: "guest-new",
    created: true,
  })),
}));

vi.mock("@/lib/db/guestAliases", () => {
  return {
    getGuestIdByAlias: async () => null,
    ensureGuestAlias: ensureGuestAliasMock,
  };
});

vi.mock("@/lib/db/guests", () => {
  return {
    getGuest: async () => ({
      guestId: "whatsapp:+59899123456",
    }),
  };
});

import { resolveGuestIdentity } from "@/lib/pipeline/resolveGuestIdentity";

describe("golden • guest aliases legacy compat", () => {
  beforeEach(() => {
    ensureGuestAliasMock.mockClear();
  });

  it("returns legacy guestId and backfills alias", async () => {
    const result = await resolveGuestIdentity({
      hotelId: "hotel-test",
      channel: "whatsapp",
      rawGuestId: "whatsapp:+59899123456",
    });

    expect(result.guestId).toBe("whatsapp:+59899123456");
    expect(result.guestAlias).toBe("whatsapp:+59899123456");
    expect(ensureGuestAliasMock).toHaveBeenCalledTimes(1);
    expect(ensureGuestAliasMock).toHaveBeenCalledWith({
      hotelId: "hotel-test",
      alias: "whatsapp:+59899123456",
      preferredGuestId: "whatsapp:+59899123456",
    });
  });
});

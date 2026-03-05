// Path: /root/begasist/test/golden/guestIdentity.golden.spec.ts

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/guestAliases", () => {
  return {
    ensureGuestAlias: async () => ({
      guestId: "guest-test",
      created: true,
    }),
  };
});

import { resolveGuestIdentity } from "@/lib/pipeline/resolveGuestIdentity";

describe("golden • guest identity alias normalization", () => {
  it("normalizes whatsapp:+E164", async () => {
    const result = await resolveGuestIdentity({
      hotelId: "hotel-test",
      channel: "whatsapp",
      rawGuestId: "whatsapp:+59899123456",
    });

    expect(result.guestAlias).toBe("whatsapp:+59899123456");
  });

  it("removes duplicated whatsapp prefix", async () => {
    const result = await resolveGuestIdentity({
      hotelId: "hotel-test",
      channel: "whatsapp",
      rawGuestId: "whatsapp:whatsapp:+59899123456",
    });

    expect(result.guestAlias).toBe("whatsapp:+59899123456");
  });

  it("normalizes email to lowercase", async () => {
    const result = await resolveGuestIdentity({
      hotelId: "hotel-test",
      channel: "email",
      rawGuestId: "USER@EMAIL.COM",
    });

    expect(result.guestAlias).toBe("email:user@email.com");
  });
});

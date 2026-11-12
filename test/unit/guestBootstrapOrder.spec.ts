// Path: test/unit/guestBootstrapOrder.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  persisted: null as any,
  confirmPersistence: true,
  issue: vi.fn(),
}));

vi.mock("@/lib/auth/guestConversationCapability", () => ({
  assertGuestCapabilityConfigured: vi.fn(() => { mocks.events.push("configured"); }),
  createGuestWebGrant: vi.fn(({ webSubject }: { webSubject: string }) => ({
    version: 1,
    webSubject,
    jtiHash: "a".repeat(64),
    scopes: ["conversation:read", "conversation:write"],
    issuedAt: "2026-11-12T12:00:00.000Z",
    expiresAt: "2026-11-19T12:00:00.000Z",
    revokedAt: null,
  })),
  issueGuestConversationCapability: mocks.issue,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async (hotelId: string) => {
    mocks.events.push("hotel");
    return { hotelId, channelConfigs: { web: { enabled: true, mode: "automatic" } } };
  }),
}));

vi.mock("@/lib/security/guestBootstrapRateLimit", () => ({
  GuestBootstrapRateLimitError: class GuestBootstrapRateLimitError extends Error {},
  enforceGuestBootstrapRateLimit: vi.fn(async () => { mocks.events.push("rate"); }),
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: vi.fn(async () => {
    mocks.events.push("identity");
    return { guestId: "guest-canonical-bootstrap" };
  }),
}));

vi.mock("@/lib/db/conversations", () => ({
  createConversation: vi.fn(async (input: any) => {
    mocks.events.push("persist");
    mocks.persisted = { ...input };
    return input;
  }),
  getConversationById: vi.fn(async () => {
    mocks.events.push("confirm");
    return mocks.confirmPersistence ? mocks.persisted : null;
  }),
}));

import { POST } from "@/app/api/guest/web/bootstrap/route";

describe("Guest Web bootstrap ordering", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    mocks.persisted = null;
    mocks.confirmPersistence = true;
    mocks.issue.mockReset();
    mocks.issue.mockImplementation(async () => {
      mocks.events.push("sign");
      return "signed-capability";
    });
  });

  it("signs only after conversation and grant persistence are confirmed", async () => {
    const response = await POST(new Request("http://localhost/api/guest/web/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: "hotel999" }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.events).toEqual(["configured", "hotel", "rate", "identity", "persist", "confirm", "sign"]);
    expect(mocks.issue).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: mocks.persisted.conversationId,
      grant: mocks.persisted.metadata.guestWebGrant,
    }));
  });

  it("does not sign or emit a capability when persistence confirmation fails", async () => {
    mocks.confirmPersistence = false;
    const response = await POST(new Request("http://localhost/api/guest/web/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: "hotel999" }),
    }));
    expect(response.status).toBe(500);
    expect(mocks.events).toEqual(["configured", "hotel", "rate", "identity", "persist", "confirm"]);
    expect(mocks.issue).not.toHaveBeenCalled();
  });
});

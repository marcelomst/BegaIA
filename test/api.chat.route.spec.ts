// Path: /root/begasist/test/api.chat.route.spec.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/chat hardening", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 400 when hotelId is missing", async () => {
    const res = await POST(
      makeReq({
        query: "Hola",
        channel: "web",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain("hotelId");
  });

  it("returns 400 when message input is empty", async () => {
    const res = await POST(
      makeReq({
        hotelId: "hotel999",
        query: "   ",
        channel: "web",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(String(json.error)).toContain("message");
  });

  it("returns controlled JSON when internal processing throws", async () => {
    vi.stubEnv("FORCE_GENERATION", "1");
    vi.stubEnv("ENABLE_TEST_FASTPATH", "0");
    vi.stubEnv("DEBUG_FASTPATH", "0");
    vi.stubEnv("OPENAI_API_KEY", "fake-key");
    vi.resetModules();

    const mh = await import("@/lib/handlers/messageHandler");
    vi.spyOn(mh, "handleIncomingMessage").mockRejectedValue(new Error("boom-raw-internal"));

    const { POST: freshPOST } = await import("@/app/api/chat/route");
    const res = await freshPOST(
      makeReq({
        hotelId: "hotel999",
        query: "Necesito ayuda",
        channel: "web",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.ok).toBe(false);
    expect(typeof json.error).toBe("string");
    expect(String(json.error)).not.toContain("boom-raw-internal");
    expect(json.conversationId).toBeTruthy();
  }, 15000);
});

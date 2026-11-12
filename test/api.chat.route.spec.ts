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

  it("returns 401 before trusting a caller-supplied hotel", async () => {
    const res = await POST(
      makeReq({
        query: "Hola",
        channel: "web",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.code).toBe("guest_capability_required");
  });

  it("returns 401 before trusting caller-supplied message metadata", async () => {
    const res = await POST(
      makeReq({
        hotelId: "hotel999",
        query: "   ",
        channel: "web",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.code).toBe("guest_capability_required");
  });

});

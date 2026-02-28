import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/whatsapp/twilio/route";

function makeFormReq(data: Record<string, string>): Request {
  const body = new URLSearchParams(data);
  return new Request("http://localhost/api/webhooks/whatsapp/twilio", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

describe("/api/webhooks/whatsapp/twilio", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 200 when To maps to hotel999", async () => {
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");
    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM123",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("returns 200 when To does not map", async () => {
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");
    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+22222222222",
      Body: "hola",
      MessageSid: "SM999",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });
});


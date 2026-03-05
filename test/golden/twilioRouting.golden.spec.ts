// Path: /root/begasist/test/golden/twilioRouting.golden.spec.ts

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("golden • twilio routing invariants", () => {
  const routePath = path.resolve(process.cwd(), "app/api/webhooks/whatsapp/twilio/route.ts");

  it("does not reintroduce ENV fallback TWILIO_WA_TO_HOTEL999", () => {
    const src = fs.readFileSync(routePath, "utf8");
    expect(src.includes("TWILIO_WA_TO_HOTEL999")).toBe(false);
  });

  it("keeps UNMAPPED_TO guardrail", () => {
    const src = fs.readFileSync(routePath, "utf8");
    expect(src.includes("[WA_TWILIO_UNMAPPED_TO]")).toBe(true);
    expect(src.includes("return Response.json({ ok: true }, { status: 200 })")).toBe(true);
  });
});

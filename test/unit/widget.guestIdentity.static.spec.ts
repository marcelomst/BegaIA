import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public BegAI widget guest identity storage", () => {
  it("persiste guestId por hotel y conserva conversationId aislado por tab", () => {
    const source = readFileSync(join(process.cwd(), "public/widget/begai-chat.js"), "utf8");

    expect(source).toContain('const guestKey = `${NEW_PREFIX}:guestId:${hotelId}`');
    expect(source).toContain('const legacyGuestSessionKey = scopedSessionKey("guestId")');
    expect(source).toContain("localStorage.getItem(guestKey)");
    expect(source).toContain("localStorage.setItem(guestKey");
    expect(source).toContain('const convKey = scopedSessionKey("conversationId")');
    expect(source).toContain("clearConv();");
    expect(source).not.toContain("sessionStorage.removeItem(guestKey)");
  });
});

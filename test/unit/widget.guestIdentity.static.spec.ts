import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public BegAI widget temporary identity containment", () => {
  it("no presenta identidad cliente ni abre SSE mientras no existe credencial Guest", () => {
    const source = readFileSync(join(process.cwd(), "public/widget/begai-chat.js"), "utf8");

    const payloadBlock = source.slice(source.indexOf("const payload = {"), source.indexOf("debug(\"chat.request\""));
    expect(payloadBlock).not.toContain("guestId");
    expect(payloadBlock).not.toContain("conversationId");
    expect(source).not.toContain("new EventSource(");
    expect(source).toContain("clearConv();");
  });
});

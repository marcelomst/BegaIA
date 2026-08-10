import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public BegAI widget assistant persona", () => {
  it("renderiza avatar del asistente y footer Powered by BegaIA sin usar emoji genérico", () => {
    const source = readFileSync(join(process.cwd(), "public/widget/begai-chat.js"), "utf8");

    expect(source).toContain("assistantCfg");
    expect(source).toContain("/brand/begaia-assistant-avatar-female-1024.png");
    expect(source).toContain("/brand/begaia-assistant-avatar-male-1024.png");
    expect(source).toContain("/brand/begaia-simbolo-transparente-1024.png");
    expect(source).toContain("bgst-launcher-avatar");
    expect(source).toContain("bgst-avatar");
    expect(source).toContain("object-position:center");
    expect(source).toContain("bgst-powered");
    expect(source).toContain("escapeHtml");
    expect(source).toContain("Powered by");
    expect(source).toContain("<strong>BegaIA</strong>");
    expect(source).not.toContain('bubble.innerHTML = "💬"');
    expect(source).not.toContain('${t("assistant")} • ${hotelId}');
  });
});

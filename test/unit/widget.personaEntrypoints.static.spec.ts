import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("widget assistant persona entrypoints", () => {
  it("el demo público carga el embed dinámico y no el bundle directo sin assistant config", () => {
    const source = readFileSync(join(process.cwd(), "examples/hotel-demo/index.html"), "utf8");

    expect(source).toContain("/widget/embed?");
    expect(source).toContain("hotel=hotel999");
    expect(source).not.toContain('window.BegAIChat = {');
    expect(source).not.toContain('src="http://localhost:3000/widget/begai-chat.js"');
  });

  it("el generador Admin entrega snippet basado en embed para heredar assistantBranding del hotel", () => {
    const source = readFileSync(join(process.cwd(), "app/admin/hotels/[hotelId]/widget/page.tsx"), "utf8");

    expect(source).toContain("/widget/embed?hotel=");
    expect(source).not.toContain("window.BegAIChat = {");
    expect(source).not.toContain("/widget/begai-chat.js");
  });
});

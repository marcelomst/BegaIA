import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public BegAI widget room_info_img renderer", () => {
  it("soporta rich.type room-info-img además de carousel", () => {
    const source = readFileSync(join(process.cwd(), "public/widget/begai-chat.js"), "utf8");

    expect(source).toContain("appendRoomInfoGallery");
    expect(source).toContain('rich.type === "room-info-img"');
    expect(source).toContain("Array.isArray(rich.data)");
    expect(source).toContain("bgst-room-gallery");
    expect(source).toContain("bgst-room-card");
    expect(source).toContain("normalizeRoomImageSrc");
  });
});

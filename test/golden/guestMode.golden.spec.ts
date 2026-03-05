// Path: /root/begasist/test/golden/guestMode.golden.spec.ts

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("golden • guest mode override guardrails", () => {
  const handlerPath = path.resolve(process.cwd(), "lib/handlers/messageHandler.ts");

  it("preserves combineModes rule: supervised dominates", () => {
    const src = fs.readFileSync(handlerPath, "utf8");
    expect(src.includes("function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode")).toBe(true);
    expect(src.includes("return (a === \"supervised\" || b === \"supervised\") ? \"supervised\" : \"automatic\";")).toBe(true);
  });

  it("uses guest.mode in supervisor decision path", () => {
    const src = fs.readFileSync(handlerPath, "utf8");
    expect(src.includes("combineModes(pre.options?.mode, pre.guest.mode ?? \"automatic\")")).toBe(true);
  });
});

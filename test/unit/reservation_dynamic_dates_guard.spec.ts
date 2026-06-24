import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const guardedSpecs = [
  "test/unit/graph_create_confirm_guard.spec.ts",
  "test/unit/messageHandler.domain_lock.spec.ts",
  "test/unit/messageHandler.guest_name_capture.spec.ts",
];

const absoluteReservationDatePattern = /\b(?:\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})\b/;

describe("reservation test date fixtures guard", () => {
  it.each(guardedSpecs)("does not use hardcoded absolute reservation dates in %s", (specPath) => {
    const fullPath = path.join(process.cwd(), specPath);
    const source = readFileSync(fullPath, "utf8");
    const violations = source
      .split("\n")
      .map((line, index) => ({ line: index + 1, text: line.trim() }))
      .filter(({ text }) => absoluteReservationDatePattern.test(text));

    expect(violations).toEqual([]);
  });
});

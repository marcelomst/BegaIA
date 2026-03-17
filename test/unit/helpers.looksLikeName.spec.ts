import { describe, expect, it } from "vitest";

import { looksLikeName } from "@/lib/agents/helpers";

describe("looksLikeName", () => {
  it("rechaza afirmativos cortos que no deben convertirse en guestName", () => {
    expect(looksLikeName("si")).toBe(false);
    expect(looksLikeName("sí")).toBe(false);
    expect(looksLikeName("ok")).toBe(false);
    expect(looksLikeName("dale")).toBe(false);
  });

  it("mantiene nombres reales válidos", () => {
    expect(looksLikeName("Martinez")).toBe(true);
    expect(looksLikeName("Juan Perez")).toBe(true);
  });
});

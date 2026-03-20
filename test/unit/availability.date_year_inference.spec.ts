import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { extractDateRangeFromTextLight } from "@/lib/handlers/pipeline/availability";

describe("availability date year inference", () => {
  const mockNow = new Date("2026-03-15T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("infers current year for future month without explicit year", () => {
    const res = extractDateRangeFromTextLight("10 de abril");
    expect(res.checkIn).toBe("2026-04-10");
  });

  it("rolls over to next year when month already passed", () => {
    const res = extractDateRangeFromTextLight("10 de enero");
    expect(res.checkIn).toBe("2027-01-10");
  });

  it("respects explicit year", () => {
    const res = extractDateRangeFromTextLight("10/04/2026");
    expect(res.checkIn).toBe("2026-04-10");
  });

  it("keeps range in same inferred year for month name range", () => {
    const res = extractDateRangeFromTextLight("10 al 12 de abril");
    expect(res.checkIn).toBe("2026-04-10");
    expect(res.checkOut).toBe("2026-04-12");
  });
});

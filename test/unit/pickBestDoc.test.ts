import { describe, it, expect } from "vitest";

function pickBestDoc(best: any | undefined, curr: any): any {
  if (!best) return curr;
  const bestHasVersion = best.version !== undefined && best.version !== null;
  const currHasVersion = curr.version !== undefined && curr.version !== null;
  if (bestHasVersion && currHasVersion) {
    const bestNum = Number(best.version);
    const currNum = Number(curr.version);
    if (Number.isFinite(bestNum) && Number.isFinite(currNum)) {
      return currNum > bestNum ? curr : best;
    }
    if (Number.isFinite(currNum) && !Number.isFinite(bestNum)) return curr;
    if (!Number.isFinite(currNum) && Number.isFinite(bestNum)) return best;
    return String(curr.version) > String(best.version) ? curr : best;
  }
  if (currHasVersion && !bestHasVersion) return curr;
  if (!currHasVersion && bestHasVersion) return best;
  const bestUpdated = best.updatedAt ? Date.parse(best.updatedAt) : NaN;
  const currUpdated = curr.updatedAt ? Date.parse(curr.updatedAt) : NaN;
  if (Number.isFinite(bestUpdated) && Number.isFinite(currUpdated)) {
    return currUpdated > bestUpdated ? curr : best;
  }
  if (Number.isFinite(currUpdated) && !Number.isFinite(bestUpdated)) return curr;
  return best;
}

const d = (partial: Record<string, any>) => ({ _id: partial._id || "id", ...partial });

describe("pickBestDoc", () => {
  it("picks higher numeric version", () => {
    const best = d({ version: 1 });
    const curr = d({ version: 2 });
    expect(pickBestDoc(best, curr)).toBe(curr);
  });

  it("picks higher numeric version even if versions are strings", () => {
    const best = d({ version: "2" });
    const curr = d({ version: "10" });
    expect(pickBestDoc(best, curr)).toBe(curr);
  });

  it("prefers doc with version over missing version", () => {
    const best = d({ version: null });
    const curr = d({ version: 1 });
    expect(pickBestDoc(best, curr)).toBe(curr);
  });

  it("prefers numeric version over non-numeric version", () => {
    const best = d({ version: "abc" });
    const curr = d({ version: 2 });
    expect(pickBestDoc(best, curr)).toBe(curr);
  });

  it("uses updatedAt when no versions", () => {
    const best = d({ updatedAt: "2025-01-01T00:00:00Z" });
    const curr = d({ updatedAt: "2025-02-01T00:00:00Z" });
    expect(pickBestDoc(best, curr)).toBe(curr);
  });

  it("keeps best when curr updatedAt is invalid", () => {
    const best = d({ updatedAt: "2025-01-01T00:00:00Z" });
    const curr = d({ updatedAt: "not-a-date" });
    expect(pickBestDoc(best, curr)).toBe(best);
  });

  it("returns curr when best is undefined", () => {
    const curr = d({ version: 1 });
    expect(pickBestDoc(undefined, curr)).toBe(curr);
  });
});

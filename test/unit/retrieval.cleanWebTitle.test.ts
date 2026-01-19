import { describe, it, expect } from "vitest";
import { cleanWebTitle } from "@/lib/agents/retrieval_based";

describe("cleanWebTitle", () => {
  it("removes separator suffixes", () => {
    expect(cleanWebTitle("Museo Ralli - TripAdvisor")).toBe("Museo Ralli");
    expect(cleanWebTitle("Casapueblo | Wikipedia")).toBe("Casapueblo");
    expect(cleanWebTitle("Parque El Jaguel • Expedia")).toBe("Parque El Jaguel");
  });

  it("removes metadata parentheses at end", () => {
    expect(cleanWebTitle("Playa Mansa (Google Maps)")).toBe("Playa Mansa");
    expect(cleanWebTitle("Puerto de Punta del Este (Sitio oficial)")).toBe("Puerto de Punta del Este");
  });

  it("keeps non-metadata parentheses", () => {
    expect(cleanWebTitle("Parque Roosevelt (Laguna)")).toBe("Parque Roosevelt (Laguna)");
    expect(cleanWebTitle("Museo (Centro) - Wikipedia")).toBe("Museo (Centro)");
  });

  it("removes provider suffix without separator", () => {
    expect(cleanWebTitle("Punta del Este TripAdvisor")).toBe("Punta del Este");
  });
});

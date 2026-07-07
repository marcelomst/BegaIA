import { describe, expect, it } from "vitest";
import { resolveKbFastpathPrecedence } from "@/lib/kb/kbPrecedencePolicy";

describe("resolveKbFastpathPrecedence", () => {
  it.each([
    "que aeropuerto hay cerca del hotel",
    "airport near the hotel",
    "cómo llego desde el aeropuerto al hotel",
    "hay taxi desde el aeropuerto",
    "hay bus desde el aeropuerto",
    "tienen transfer desde el aeropuerto",
    "tem transfer do aeroporto",
    "hay traslado al hotel",
    "tienen ómnibus cerca",
    "tem ônibus do aeroporto",
  ])("returns arrivals_transport for transport signal: %s", (query) => {
    const decision = resolveKbFastpathPrecedence({ query });

    expect(decision).toEqual(expect.objectContaining({
      category: "retrieval_based",
      promptKey: "arrivals_transport",
      categoryId: "retrieval_based/arrivals_transport",
      reason: "transport_signal_over_nearby_signal",
      confidence: 0.97,
      source: "kb_precedence_policy",
      defersToRuntimeAction: false,
      winningSignal: "transport",
    }));
  });

  it("makes transport beat nearby_points when both signals are present", () => {
    const decision = resolveKbFastpathPrecedence({
      query: "que aeropuerto hay cerca del hotel",
    });

    expect(decision?.promptKey).toBe("arrivals_transport");
    expect(decision?.losingSignals).toContain("nearby_points");
  });

  it.each([
    "qué lugares hay cerca del hotel",
    "qué puedo visitar cerca",
    "lugares cercanos",
    "atracciones cerca del hotel",
  ])("does not override pure nearby query: %s", (query) => {
    expect(resolveKbFastpathPrecedence({ query })).toBeNull();
  });

  it("does not capture transactional reservation actions with reservation context", () => {
    const decision = resolveKbFastpathPrecedence({
      query: "quiero reservar una habitación y saber el taxi desde el aeropuerto",
      hasReservationContext: true,
      transactionalIntent: { kind: "create", confidence: 0.9 },
    });

    expect(decision).toBeNull();
  });
});

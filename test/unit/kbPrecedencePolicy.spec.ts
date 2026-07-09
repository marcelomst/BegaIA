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

  it.each([
    "Que tipos de habitaciones tienen?",
    "qué habitaciones tienen?",
    "mostrame las habitaciones",
    "quiero ver las habitaciones",
    "tenés fotos de las habitaciones?",
    "me mostrás fotos de las habitaciones?",
    "qué habitaciones tienen con fotos?",
  ])("returns room_info_img for room inventory visual query when images exist: %s", (query) => {
    const decision = resolveKbFastpathPrecedence({ query, hasRoomImages: true });

    expect(decision).toEqual(expect.objectContaining({
      category: "retrieval_based",
      promptKey: "room_info_img",
      categoryId: "retrieval_based/room_info_img",
      reason: "room_inventory_visual_signal_with_images",
      confidence: 0.95,
      source: "kb_precedence_policy",
      defersToRuntimeAction: false,
      winningSignal: "room_inventory_visual",
    }));
  });

  it("does not return room_info_img when hotel has no room images", () => {
    expect(resolveKbFastpathPrecedence({
      query: "Que tipos de habitaciones tienen?",
      hasRoomImages: false,
    })).toBeNull();
  });

  it.each([
    "quiero reservar una doble",
    "reservame una habitación doble",
    "quiero una habitación del 10 al 12",
  ])("does not capture booking intent as room_info_img: %s", (query) => {
    expect(resolveKbFastpathPrecedence({ query, hasRoomImages: true })).toBeNull();
  });
});

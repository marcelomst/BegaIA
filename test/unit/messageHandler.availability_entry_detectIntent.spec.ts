import { describe, expect, it } from "vitest";

import { detectIntent } from "@/lib/handlers/messageHandler";

describe("messageHandler detectIntent availability entry", () => {
  const emptyState = { draft: null, confirmedBooking: null };

  it.each([
    "tienen disponibilidad",
    "hay disponibilidad",
    "tienen disponibilidad para este fin de semana",
    "availability for this weekend",
    "quiero saber si tienen disponibilidad",
  ])("clasifica %s como reservation", (text) => {
    expect(detectIntent(text, emptyState)).toBe("reservation");
  });

  it.each([
    "quiero reservar",
    "book a room",
  ])("preserva intents ya cubiertos para %s", (text) => {
    expect(detectIntent(text, emptyState)).toBe("reservation");
  });

  it.each([
    "qué eventos hay este fin de semana",
    "me recordás la política",
    "hola",
  ])("no fuerza reservation para %s", (text) => {
    expect(detectIntent(text, emptyState)).toBe("ambiguous");
  });
});

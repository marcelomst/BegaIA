import { describe, expect, it } from "vitest";

import { normalizeReservationIntent } from "@/lib/handlers/pipeline/availability";

describe("availability.normalizeReservationIntent", () => {
  it.each([
    ["confirmar", "confirm", true],
    ["comfirmar", "confirm", true],
    ["confimar", "confirm", true],
    ["dale", "affirmative", true],
    ["ok hacelo", "confirm", true],
    ["sí, adelante", "confirm", true],
    ["yes confirm", "confirm", true],
  ])("normaliza %s", (text, kind, executable) => {
    const result = normalizeReservationIntent(String(text));
    expect(result.kind).toBe(kind);
    expect(result.executable).toBe(executable);
  });

  it.each([
    ["no confirmes todavía", "deny_confirm", false],
    ["quiero confirmar si tienen lugar", "other", false],
    ["antes de confirmar, ¿me recordás el precio?", "other", false],
  ])("no ejecuta falsos positivos para %s", (text, kind, executable) => {
    const result = normalizeReservationIntent(String(text));
    expect(result.kind).toBe(kind);
    expect(result.executable).toBe(executable);
  });
});

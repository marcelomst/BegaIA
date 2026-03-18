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
    ["quiero cambiar la fecha", "modify", true],
    ["modificar reserva", "modify", true],
    ["cambiar mi reserva", "modify", true],
    ["edit booking", "modify", true],
    ["quiero cancelar", "cancel", true],
    ["cancelar reserva", "cancel", true],
    ["anular mi reserva", "cancel", true],
    ["cancel booking", "cancel", true],
  ])("normaliza modify/cancel para %s", (text, kind, executable) => {
    const result = normalizeReservationIntent(String(text));
    expect(result.kind).toBe(kind);
    expect(result.executable).toBe(executable);
  });

  it.each([
    ["no confirmes todavía", "deny_confirm", false],
    ["quiero confirmar si tienen lugar", "other", false],
    ["antes de confirmar, ¿me recordás el precio?", "other", false],
    ["quiero saber si puedo cancelar", "other", false],
    ["antes de cancelar, ¿me recordás la política?", "other", false],
    ["si cancelo, me cobran?", "other", false],
    ["quiero modificar si hay lugar", "other", false],
  ])("no ejecuta falsos positivos para %s", (text, kind, executable) => {
    const result = normalizeReservationIntent(String(text));
    expect(result.kind).toBe(kind);
    expect(result.executable).toBe(executable);
  });
});

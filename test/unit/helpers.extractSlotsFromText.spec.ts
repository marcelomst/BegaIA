import { describe, expect, it } from "vitest";

import { extractSlotsFromText } from "@/lib/agents/helpers";

describe("extractSlotsFromText", () => {
  it("extrae guestName inline con patron 'a nombre de X' dentro de un turno rico", () => {
    const slots = extractSlotsFromText(
      "quiero reservar del 1 al 5 de mayo de 2026 para 2 personas en una doble a nombre de Ana Gomez",
      "es"
    );

    expect(slots).toMatchObject({
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      numGuests: "2",
      roomType: "double",
      guestName: "Ana Gomez",
    });
  });

  it("extrae guestName inline con patron 'nombre X' dentro de un turno rico", () => {
    const slots = extractSlotsFromText(
      "quiero reservar del 1 al 5 de mayo de 2026, nombre Ana Gomez, doble para 2 personas",
      "es"
    );

    expect(slots).toMatchObject({
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      numGuests: "2",
      roomType: "double",
      guestName: "Ana Gomez",
    });
  });

  it("no inventa guestName si el turno rico no trae un patron explicito", () => {
    const slots = extractSlotsFromText(
      "quiero reservar una doble del 1 al 5 de mayo de 2026 para 2 personas",
      "es"
    );

    expect(slots.guestName).toBeUndefined();
  });

  it("no captura falsos positivos como 'nombre de la empresa Acme'", () => {
    const slots = extractSlotsFromText(
      "quiero reservar del 1 al 5 de mayo de 2026, nombre de la empresa Acme, doble para 2",
      "es"
    );

    expect(slots).toMatchObject({
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      numGuests: "2",
      roomType: "double",
    });
    expect(slots.guestName).toBeUndefined();
  });
});

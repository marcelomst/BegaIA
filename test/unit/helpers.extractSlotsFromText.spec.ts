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

  it("detecta total directo con 'somos 3'", () => {
    const slots = extractSlotsFromText("somos 3 para la reserva", "es");
    expect(slots.numGuests).toBe("3");
  });

  it("detecta total directo con 'vamos 2'", () => {
    const slots = extractSlotsFromText("vamos 2 del 1 al 5 de mayo", "es");
    expect(slots.numGuests).toBe("2");
  });

  it("detecta total directo con 'seríamos 4'", () => {
    const slots = extractSlotsFromText("seríamos 4 en una doble", "es");
    expect(slots.numGuests).toBe("4");
  });

  it("detecta composición con '2 adultos y 1 menor'", () => {
    const slots = extractSlotsFromText("2 adultos y 1 menor", "es");
    expect(slots.numGuests).toBe("3");
  });

  it("detecta composición con '2 mayores y 1 niño'", () => {
    const slots = extractSlotsFromText("2 mayores y 1 niño", "es");
    expect(slots.numGuests).toBe("3");
  });

  it("detecta composición con '2 adultos, 1 menor y 1 bebé'", () => {
    const slots = extractSlotsFromText("2 adultos, 1 menor y 1 bebé", "es");
    expect(slots.numGuests).toBe("4");
  });

  it("no resuelve contradicciones entre total directo y composición", () => {
    const slots = extractSlotsFromText("somos 2, 2 adultos y 1 menor", "es");
    expect(slots.numGuests).toBeUndefined();
  });

  it("no absorbe un número suelto ambiguo fuera de contexto", () => {
    const slots = extractSlotsFromText("2", "es");
    expect(slots.numGuests).toBeUndefined();
  });
});

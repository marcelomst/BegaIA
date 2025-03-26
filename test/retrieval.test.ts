import { test, expect } from "vitest";

import { retrieve_hotel_info } from "../lib/agents/room_info.ts";

test("Recupera información sobre habitaciones correctamente", async () => {
  const query = "¿Qué tipos de habitaciones tienen?";
  const response = await retrieve_hotel_info(query, "es");
  console.log("📌 Respuesta obtenida:", response);

  expect(response).toContain("Habitación");
  expect(response).toContain("área de");
  expect(response).toContain("Baño privado");
});



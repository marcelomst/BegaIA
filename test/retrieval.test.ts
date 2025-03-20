import { test, expect } from "vitest";

import { retrieve_hotel_info } from "../lib/agents/room_info.ts";

test("Recupera información sobre habitaciones correctamente", async () => {
  const query = "¿Qué tipos de habitaciones tienen?";
  const response = await retrieve_hotel_info("¿Tienen Wi-Fi?");
  console.log("📌 Respuesta obtenida:", response); // 🛑 Agregar esta línea
  expect(response).toContain("🏨 Habitación Doble");
  expect(response).toContain("📏 Área de");
  expect(response).toContain("🚿 Baño privado");
});

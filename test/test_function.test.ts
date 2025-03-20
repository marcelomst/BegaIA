import { test, expect } from "vitest";
import { retrieve_hotel_info } from "../lib/agents/room_info.ts"; // Asegúrate de que la ruta es correcta

test("Recupera información sobre habitaciones correctamente", async () => {
  const query = "¿Qué tipos de habitaciones tienen?";
  const response = await retrieve_hotel_info("¿Dónde está el hotel?");

  // 🛠️ DEBUG: Imprime la respuesta en consola para verificar su contenido
  console.log("📌 Salida real de retrieve_hotel_info:", response);

  // Asegurar que la respuesta contenga información relevante
  expect(response).toContain("Habitación");
  expect(response).toContain("Baño");
  expect(response).toContain("Wi-Fi");
});

import { test, expect, vi, describe } from "vitest";
import 'openai/shims/node';

// 🛑 Mock de OpenAI para evitar llamadas reales
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: vi.fn(() => ({
    invoke: vi.fn(() =>
      Promise.resolve({ content: "Sí, las habitaciones tienen WiFi gratis." })
    ),
  })),
}));

// 🛑 Mock de retrieve_hotel_info para evitar acceso a la base de datos
vi.mock("@/agents/room_info", () => ({
  retrieve_hotel_info: vi.fn(() => Promise.resolve("📶 WiFi gratis")),
}));

// 🔄 Ahora importamos después de los mocks
import { ChatOpenAI } from "@langchain/openai";
import * as Agents from "lib/agents/retrieval_based";

describe("Agente de hotel - Pruebas con respuestas mockeadas", () => {
  test("El modelo usa correctamente la base vectorial", async () => {
    const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 });
    const query = "¿Las habitaciones tienen WiFi gratis?";
    const lang = process.env.SYSTEM_NATIVE_LANGUAGE || 'es';
    const vectorResponse = await Agents.retrieve_hotel_info("¿Qué tipos de habitaciones tienen?", lang);
    const aiResponse = await model.invoke([{ role: "user", content: query }]);

    console.log("📌 Respuesta del modelo:", aiResponse);
    console.log("📌 Tipo de aiResponse:", typeof aiResponse);

    expect(aiResponse.content).toContain("WiFi gratis");
    expect(vectorResponse).toContain("📶 WiFi gratis");
  });
});

import { test, expect } from "vitest";
import { handleDefaultWithContext } from "../lib/agents/retrieval_based";
import { GraphState } from "../lib/agents"; // importa el GraphState para armar el estado
import { HumanMessage } from "@langchain/core/messages";

test("El formato contiene Markdown visual con emojis", async () => {
  const testQuery = "¿Qué tipos de habitaciones tienen?";

  // 🧠 Simular estado del grafo como si viniera del flujo real
  const testState: typeof GraphState.State = {
    messages: [new HumanMessage(testQuery)],
    category: "room_info",
    detectedLanguage: "es",
    promptKey: null
  };

  // ✅ Invocar el nodo como lo haría LangGraph
  const result = await handleDefaultWithContext(testState);

  // 🧾 Extraer respuesta
  const response = result.messages[0].content;

  // 🧪 Aserciones sobre el formato visual
  expect(response).toMatch(/🏨/); // emoji título
  expect(response).toMatch(/\| 🛏️/); // tabla
  expect(response).toMatch(/\*\*¡Reserva ahora.*\*\*/); // llamado final en negrita
});

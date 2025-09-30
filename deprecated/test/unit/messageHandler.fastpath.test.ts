// Path: /root/begasist/test/unit/messageHandler.fastpath.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// En setup ya quedó NODE_ENV test, así que IS_TEST=true en messageHandler.
// Mock del grafo para verificar que NO se llama.
const graphInvoke = vi.fn();
// ✅ mock seguro (sin capturar variables locales)
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ content: "LLM (no se usa en fast-path)" }],
      category: "support",
      reservationSlots: {},
    })),
  },
}));

// Mocks de persistencia ya están en test/setup (db/messages, conversations, etc.)
import { getCollection } from "../mocks/astra";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

describe("messageHandler fast-path (modo test)", () => {
  beforeEach(() => {
    graphInvoke.mockReset();
  });

  it("no llama al LLM y responde con el texto fijo", async () => {
    const msg = {
      messageId: "m1",
      hotelId: "hotel999",
      channel: "web" as const,
      sender: "guest",
      role: "user" as const,
      content: "necesito ayuda",
      timestamp: new Date().toISOString(),
      conversationId: "conv-fast",
    };

    await handleIncomingMessage(msg as any, { mode: "automatic" });

    // grafo NO invocado
    expect(graphInvoke).not.toHaveBeenCalled();

    // Se guardan 2 mensajes (inbound + respuesta IA)
    const docs = await getCollection("messages").findMany({ conversationId: "conv-fast" });
    const ai = docs.find(d => d.role === "ai");
    expect(ai?.content).toContain("Estoy para ayudarte");
    expect(ai?.status).toBe("sent");
  });
});

// Path: /root/begasist/test/unit/messageHandler.test.ts
import { describe, it, expect, vi } from "vitest";

// Mocks de infra
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

// Mock del grafo (evita llamadas reales a LLM)
vi.mock("@/lib/agents/graph", () => {
  return {
    agentGraph: {
      invoke: vi.fn(async (_args: any) => {
        return {
          messages: [{ role: "assistant", content: "¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte." }],
          nextCategory: "other",
          nextSlots: {},
        };
      }),
    },
  };
});

import { getCollection } from "../mocks/astra";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

describe("handleIncomingMessage (unit)", () => {
  it("persiste un mensaje entrante y permite inspeccionarlo en DB", async () => {
    const msg = {
      hotelId: "hotel999",
      channel: "web",
      conversationId: "conv-1",
      messageId: "m-1",
      sender: "guest",
      status: "received",
      content: "hola",
      timestamp: Date.now(),
    };

    await handleIncomingMessage(msg as any, { mode: "automatic" });

    const messages = await getCollection("messages").findMany({
      hotelId: "hotel999",
      messageId: "m-1",
    });
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe("hola");
  });

  it(
    "es idempotente: no duplica si se reenvía con el mismo messageId",
    async () => {
      const msg = {
        hotelId: "hotel999",
        channel: "web",
        conversationId: "conv-1",
        messageId: "m-dup",
        sender: "guest",
        status: "received",
        content: "¿hay disponibilidad?",
        timestamp: Date.now(),
      };

      await handleIncomingMessage(msg as any, { mode: "automatic" });
      // reintento con contenido distinto; debe conservar el original
      await handleIncomingMessage(
        { ...msg, content: "¿hay disponibilidad? (replay)" } as any,
        { mode: "automatic" }
      );

      const messages = await getCollection("messages").findMany({
        hotelId: "hotel999",
        messageId: "m-dup",
      });
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("¿hay disponibilidad?");
    },
    15000
  );

  it("flujo supervisado: si queda 'pending' igual envía acuse estándar; si queda 'sent' envía la final", async () => {
    const sendReply = vi.fn(async (_reply: string) => { /* no-op */ });

    const incoming = {
      hotelId: "hotel999",
      channel: "web",
      conversationId: "conv-2",
      messageId: "m-pend-1",
      sender: "guest",
      status: "received",
      content: "Por favor, armá una respuesta sugerida",
      timestamp: Date.now(),
    };

    await handleIncomingMessage(incoming as any, { mode: "supervised", sendReply });

    const col = getCollection("messages");
    const msgsConv2 = await col.findMany({
      hotelId: "hotel999",
      conversationId: "conv-2",
    });

    const assistantMsg = msgsConv2.find((m) => m.sender === "assistant");
    expect(assistantMsg).toBeTruthy();
    expect(["pending", "sent"]).toContain(assistantMsg!.status);

    // Si el handler dejó la respuesta como 'pending', igual debe haberse enviado
    // un acuse estandarizado al huésped (ej.: menciona que un recepcionista revisa la consulta).
    // Aceptamos minúsculas/mayúsculas y variaciones menores:
    const ACK_REGEX = /su consulta.*(revisada|siendo revisada).*recepcionista/i;

    if (assistantMsg!.status === "pending") {
      expect(sendReply).toHaveBeenCalledTimes(1);
      const [firstArg] = sendReply.mock.calls[0];
      expect(typeof firstArg).toBe("string");
      expect(firstArg).toMatch(ACK_REGEX);
    } else {
      // status === "sent": se envió la respuesta final exactamente una vez
      expect(sendReply).toHaveBeenCalledTimes(1);
    }
  });
});

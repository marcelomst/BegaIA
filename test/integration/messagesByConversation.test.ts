// /test/integration/messagesByConversation.test.ts
import { describe, it, expect } from "vitest";
import { getMessagesFromAstraByConversation } from "@/lib/db/messages";

// Parámetros de prueba (usá valores válidos de tu entorno)
const TEST_HOTEL_ID = "hotel123";
const TEST_CONVERSATION_ID = "test-convo-001";
const TEST_CHANNEL = "web";

describe("🔍 Mensajes por conversación", () => {
  it("debería devolver los mensajes de una conversación específica y del hotel correcto", async () => {
    const messages = await getMessagesFromAstraByConversation(
      TEST_HOTEL_ID,
      TEST_CHANNEL,
      TEST_CONVERSATION_ID
    );

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(0); // puede no haber mensajes

    for (const msg of messages) {
      expect(msg.hotelId).toBe(TEST_HOTEL_ID);
      expect(msg.conversationId).toBe(TEST_CONVERSATION_ID);
      expect(msg.channel).toBe(TEST_CHANNEL);
    }
  });
});

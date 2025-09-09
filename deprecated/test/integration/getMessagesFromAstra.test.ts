// /test/integration/getMessagesFromAstra.test.ts

import { describe, it, expect } from "vitest";
import { getMessagesFromAstra } from "@/lib/db/messages";

describe("🧪 getMessagesFromAstra", () => {
  it("recupera mensajes reales del canal web", async () => {
    const hotelId = "hotel123";
    const channel = "web";

    const messages = await getMessagesFromAstra(hotelId, channel);

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);

    const msg = messages[0];
    expect(msg).toHaveProperty("messageId");
    expect(msg).toHaveProperty("hotelId", hotelId);
    expect(msg).toHaveProperty("channel", channel);
    expect(msg).toHaveProperty("sender");
    expect(msg).toHaveProperty("content");
    expect(msg).toHaveProperty("timestamp");
    expect(msg).toHaveProperty("time");
    expect(msg).toHaveProperty("status");
    expect(msg).toHaveProperty("suggestion");

    // Campos opcionales, si existen, se validan
    if (msg.conversationId) {
      expect(typeof msg.conversationId).toBe("string");
    }
    if (msg.approvedResponse) {
      expect(typeof msg.approvedResponse).toBe("string");
    }
    if (msg.respondedBy) {
      expect(typeof msg.respondedBy).toBe("string");
    }

    expect(["sent", "pending", "rejected", "expired"]).toContain(msg.status);
  });
});

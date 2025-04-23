// /root/begasist/test/services/channelMemory.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { channelMemory } from "@/lib/services/channelMemory";

describe("channelMemory", () => {
  const channel = "web";
  const hotelId = "hotel123";

  beforeEach(() => {
    channelMemory.getMessages(channel).splice(0); // limpia el array
  });

  it("debe mantener solo los últimos 100 mensajes", () => {
    for (let i = 0; i < 110; i++) {
      channelMemory.addMessage({
        id: `msg-${i}`,
        channel,
        hotelId,
        sender: "Test",
        time: "10:00",
        timestamp: new Date().toISOString(),
        content: `Mensaje ${i}`,
        suggestion: `Sugerencia ${i}`,
        status: "pending",
      });
    }

    const messages = channelMemory.getMessages(channel);
    expect(messages.length).toBe(100);
    expect(messages[0].id).toBe("msg-10");
    expect(messages[99].id).toBe("msg-109");
  });
});

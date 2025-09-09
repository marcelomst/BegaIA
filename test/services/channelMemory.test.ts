// /test/services/webMemory.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { channelMemory } from "@/lib/services/channelMemory";
import type { ChannelMessage } from "@/types/channel";

describe("channelMemory (web)", () => {
  const baseMessage: Omit<ChannelMessage, "messageId"> = {
    hotelId: "hotel999",
    channel: "web",
    sender: "Test",
    content: "Mensaje de prueba",
    timestamp: new Date().toISOString(),
    time: "10:00",
    suggestion: "Sugerencia de prueba",
    status: "pending",
  };

  beforeEach(() => {
    // 🔁 Reset del almacenamiento en memoria para pruebas
    // @ts-ignore
    globalThis.__channel_memory__ = {};
  });

  it("debe mantener solo los últimos 100 mensajes", () => {
    for (let i = 0; i < 110; i++) {
      const msg: ChannelMessage = {
        ...baseMessage,
        messageId: `msg-${i}`,
      };
      channelMemory.addMessage(msg);
    }

    const messages = channelMemory.getMessages("web");
    expect(messages.length).toBe(100);
    expect(messages[0].messageId).toBe("msg-10");
    expect(messages[99].messageId).toBe("msg-109");
  });
});

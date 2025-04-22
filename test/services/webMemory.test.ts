import { describe, it, expect, beforeEach } from "vitest";
import { webMemory } from "@/lib/services/webMemory";

describe("webMemory", () => {
  beforeEach(() => {
    webMemory.clearMessages();
  });

  it("debe mantener solo los últimos 100 mensajes", () => {
    for (let i = 0; i < 110; i++) {
      webMemory.addMessage({
        id: `msg-${i}`,
        sender: "Test",
        time: "10:00",
        timestamp: new Date().toISOString(),
        content: `Mensaje ${i}`,
        suggestion: `Sugerencia ${i}`,
        status: "pending",
      });
    }

    const messages = webMemory.getMessages();
    expect(messages.length).toBe(100);
    expect(messages[0].id).toBe("msg-10");  // El primero que debería quedar
    expect(messages[99].id).toBe("msg-109"); // El último que se insertó
  });
});

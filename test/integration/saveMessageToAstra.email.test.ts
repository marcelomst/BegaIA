// /test/integration/saveMessageToAstra.email.test.ts

import { describe, it, expect } from "vitest";
import { saveMessageToAstra, getMessagesFromAstra } from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Message } from "@/types/message";
import type { Channel } from "@/types/channel";
import type { MessageStatus } from "@/types/message";

describe("💾 Guardar mensaje del canal email en AstraDB", () => {
  const id = `test-email-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "email";
  const status: MessageStatus = "pending";

  it("guarda un mensaje correctamente en la colección global", async () => {
    const message: Message = {
      id,
      hotelId,
      channel,
      sender: "cliente@email.com",
      content: "¿Hay habitaciones disponibles?",
      timestamp: new Date().toISOString(),
      status,
      respondedBy: undefined,
      approvedResponse: undefined,
      suggestion: "Sí, tenemos habitaciones disponibles para hoy.",
    };

    await saveMessageToAstra(message);

    const results = await getMessagesFromAstra(hotelId, channel);
    const saved = results.find((m) => m.id === id);

    expect(saved).toBeDefined();
    expect(saved?.hotelId).toBe(hotelId);
    expect(saved?.channel).toBe(channel);
    expect(saved?.sender).toBe(message.sender);
    expect(saved?.content).toBe(message.content);
    expect(saved?.status).toBe(status);
  });
});

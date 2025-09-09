// /test/integration/saveMessageToAstra.email.test.ts

import { describe, it, expect } from "vitest";
import { saveMessageToAstra, getMessagesFromAstra } from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { ChannelMessage } from "@/types/channel";
import type { Channel } from "@/types/channel";
import type { MessageStatus } from "@/types/channel";

describe("💾 Guardar mensaje del canal email en AstraDB", () => {
  const messageId = `test-email-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "email";
  const status: MessageStatus = "pending";

  it("guarda un mensaje correctamente en la colección global", async () => {
    const message: ChannelMessage = {
      messageId,
      conversationId: `conv-${randomUUID()}`,
      hotelId,
      channel,
      sender: "cliente@email.com",
      content: "¿Hay habitaciones disponibles?",
      timestamp: new Date().toISOString(),
      time: "13:22",
      status,
      suggestion: "Sí, tenemos habitaciones disponibles para hoy.",
      approvedResponse: "Perfecto, ya le confirmo la reserva.",
      respondedBy: "recepcionista@hotel.com"
    };
    await saveMessageToAstra(message);

    const results = await getMessagesFromAstra(hotelId, channel);
    const saved = results.find((m) => m.messageId === messageId);

    

    expect(saved).toBeDefined();
    expect(saved?.hotelId).toBe(hotelId);
    expect(saved?.channel).toBe(channel);
    expect(saved?.sender).toBe(message.sender);
    expect(saved?.content).toBe(message.content);
    expect(saved?.status).toBe(status);
  });
});

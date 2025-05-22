// /test/integration/updateMessageInAstra.test.ts

import { describe, it, expect } from "vitest";
import {
  saveMessageToAstra,
  updateMessageInAstra,
  getMessagesFromAstra,
  deleteMessageFromAstra,
} from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Channel } from "@/types/channel";
import type { ChannelMessage, MessageStatus } from "@/types/channel";

describe("🔁 updateMessageInAstra", () => {
  const messageId = `test-update-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";
  const status: MessageStatus = "pending";

  it("actualiza el estado y el respondedBy de un mensaje guardado", async () => {
    await deleteMessageFromAstra(messageId); // 🧹 limpieza inicial

    const originalMessage: ChannelMessage = {
      messageId,
      hotelId,
      channel,
      sender: "usuario-web",
      timestamp: new Date().toISOString(),
      time: "12:00",
      content: "¿Puedo dejar el equipaje antes del check-in?",
      suggestion: "Sí, podemos guardarlo en recepción sin costo.",
      respondedBy: undefined,
      approvedResponse: undefined,
      status,
      conversationId: `conv-${randomUUID()}`,
    };

    await saveMessageToAstra(originalMessage);

    const changes: Partial<ChannelMessage> = {
      status: "sent",
      respondedBy: "recepcionista@hotel.com",
      approvedResponse: "Sí, puede dejarlo desde las 9 am.",
    };

    await updateMessageInAstra(hotelId, messageId, changes);

    const results = await getMessagesFromAstra(hotelId, channel);
    const updated = results.find((msg) => msg.messageId === messageId);

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("sent");
    expect(updated?.respondedBy).toBe("recepcionista@hotel.com");
    expect(updated?.approvedResponse).toBe("Sí, puede dejarlo desde las 9 am.");
  });
});

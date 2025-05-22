// /test/integration/persistApprovedResponse.test.ts

import { describe, it, expect, beforeAll } from "vitest";
import {
  saveMessageToAstra,
  updateMessageInAstra,
  getMessagesFromAstra,
  deleteTestMessagesFromAstra,
} from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Channel, ChannelMessage, MessageStatus } from "@/types/channel";

describe("🧪 Persistencia de approvedResponse y respondedBy", () => {
  const messageId = `test-msg-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";
  const status: MessageStatus = "pending";

  beforeAll(async () => {
    await deleteTestMessagesFromAstra();
  });

  it("debería guardar y luego actualizar un mensaje con approvedResponse", async () => {
    const initialMessage: ChannelMessage = {
      messageId,
      hotelId,
      channel,
      conversationId: `conv-${randomUUID()}`,
      sender: "Usuario Web",
      content: "¿Se puede hacer check-in temprano?",
      timestamp: new Date().toISOString(),
      time: "10:15",
      suggestion: "Sí, a partir de las 11 am sujeto a disponibilidad.",
      approvedResponse: undefined,
      respondedBy: undefined,
      status,
    };

    await saveMessageToAstra(initialMessage);

    const changes: Partial<ChannelMessage> = {
      approvedResponse: "Sí, se puede hacer check-in a las 11 am.",
      respondedBy: "sofia@hotel.com",
      status: "sent",
    };

    await updateMessageInAstra(hotelId, messageId, changes);

    const results = await getMessagesFromAstra(hotelId, channel);
    const updated = results.find((msg) => msg.messageId === messageId);

    expect(updated).toBeDefined();
    expect(updated?.approvedResponse).toBe("Sí, se puede hacer check-in a las 11 am.");
    expect(updated?.respondedBy).toBe("sofia@hotel.com");
    expect(updated?.status).toBe("sent");
  });
});

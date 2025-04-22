// /test/integration/persistApprovedResponse.test.ts

import { describe, it, expect } from "vitest";
import {
  saveMessageToAstra,
  updateMessageInAstra,
  getMessagesFromAstra,
} from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Message, MessageStatus } from "@/types/message";
import type { Channel } from "@/types/channel";

describe("🧪 Persistencia de approvedResponse y respondedBy", () => {
  const id = `test-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";
  const status: MessageStatus = "pending";

  it("debería guardar y luego actualizar un mensaje con approvedResponse", async () => {
    const initialMessage: Message = {
      id,
      hotelId,
      channel,
      sender: "Usuario Web",
      timestamp: new Date().toISOString(),
      content: "¿Se puede hacer check-in temprano?",
      suggestion: "Sí, a partir de las 11 am sujeto a disponibilidad.",
      approvedResponse: undefined, // ✅ corregido
      respondedBy: undefined,      // ✅ corregido
      status,
    };

    await saveMessageToAstra(initialMessage);

    const changes: Partial<Message> = {
      approvedResponse: "Sí, se puede hacer check-in a las 11 am.",
      respondedBy: "sofia@hotel.com",
      status: "approved" as MessageStatus,
    };

    await updateMessageInAstra(id, changes);

    const results = await getMessagesFromAstra(hotelId, channel);
    const updated = results.find((msg) => msg.id === id);

    expect(updated).toBeDefined();
    expect(updated?.approvedResponse).toBe("Sí, se puede hacer check-in a las 11 am.");
    expect(updated?.respondedBy).toBe("sofia@hotel.com");
    expect(updated?.status).toBe("approved");
  });
});

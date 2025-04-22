// /test/integration/updateMessageInAstra.test.ts

import { describe, it, expect } from "vitest";
import {
  saveMessageToAstra,
  updateMessageInAstra,
  getMessagesFromAstra,
} from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Message, MessageStatus } from "@/types/message";
import type { Channel } from "@/types/channel";

describe("🔁 updateMessageInAstra", () => {
  const id = `test-update-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";
  const status: MessageStatus = "pending";

  it("actualiza el estado y el respondedBy de un mensaje guardado", async () => {
    const originalMessage: Message = {
      id,
      hotelId,
      channel,
      sender: "usuario-web",
      timestamp: new Date().toISOString(),
      content: "¿Puedo dejar el equipaje antes del check-in?",
      suggestion: "Sí, podemos guardarlo en recepción sin costo.",
      respondedBy: undefined,
      approvedResponse: undefined,
      status,
    };

    await saveMessageToAstra(originalMessage);

    const changes: Partial<Message> = {
      status: "approved" as MessageStatus,
      respondedBy: "recepcionista@hotel.com",
      approvedResponse: "Sí, puede dejarlo desde las 9 am.",
    };

    await updateMessageInAstra(id, changes);

    const results = await getMessagesFromAstra(hotelId, channel);
    const updated = results.find((msg) => msg.id === id);

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("approved");
    expect(updated?.respondedBy).toBe("recepcionista@hotel.com");
    expect(updated?.approvedResponse).toBe("Sí, puede dejarlo desde las 9 am.");
  });
});

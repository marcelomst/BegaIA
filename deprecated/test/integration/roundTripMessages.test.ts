// /test/integration/roundTripMessages.test.ts

import { describe, it, expect } from "vitest";
import { saveMessageToAstra, getMessagesFromAstra } from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { ChannelMessage } from "@/types/channel";
import type { Channel } from "@/types/channel";

describe("🔁 Round-trip de persistencia de mensajes", () => {
  const messageId = `test-msg-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";

  it("guarda y recupera un mensaje completo correctamente", async () => {
    const msg: ChannelMessage = {
      messageId,
      conversationId: `conv-${randomUUID()}`,
      hotelId,
      channel,
      sender: "Usuario Web",
      timestamp: new Date().toISOString(),
      time: "13:30",
      content: "¿Tienen habitaciones con vista al mar?",
      suggestion: "Sí, tenemos habitaciones con vista al mar disponibles.",
      approvedResponse: "Sí, disponibles. ¿Le gustaría reservar?",
      status: "sent",
      respondedBy: "sofia@hotel.com",
    };

    await saveMessageToAstra(msg);

    const results = await getMessagesFromAstra(hotelId, channel);
    const saved = results.find((m) => m.messageId === messageId);

    expect(saved).toBeDefined();
    expect(saved?.content).toBe(msg.content);
    expect(saved?.approvedResponse).toBe(msg.approvedResponse);
    expect(saved?.respondedBy).toBe(msg.respondedBy);
    expect(saved?.status).toBe(msg.status);
  });
});

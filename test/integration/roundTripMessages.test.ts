// /test/integration/roundTripMessages.test.ts

import { describe, it, expect } from "vitest";
import { saveMessageToAstra, getMessagesFromAstra } from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Message } from "@/types/message";
import type { Channel } from "@/types/channel";

describe("🔁 Round-trip de persistencia de mensajes", () => {
  const id = `test-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";

  it("guarda y recupera un mensaje completo correctamente", async () => {
    const msg: Message = {
      id,
      hotelId,
      channel,
      sender: "Usuario Web",
      timestamp: new Date().toISOString(),
      content: "¿Tienen habitaciones con vista al mar?",
      suggestion: "Sí, tenemos habitaciones con vista al mar disponibles.",
      approvedResponse: "Sí, disponibles. ¿Le gustaría reservar?",
      status: "approved",
      respondedBy: "sofia@hotel.com",
    };

    await saveMessageToAstra(msg);

    const results = await getMessagesFromAstra(hotelId, channel);
    const saved = results.find((m) => m.id === id);

    expect(saved).toBeDefined();
    expect(saved?.content).toBe(msg.content);
    expect(saved?.approvedResponse).toBe(msg.approvedResponse);
    expect(saved?.respondedBy).toBe(msg.respondedBy);
    expect(saved?.status).toBe(msg.status);
  });
});

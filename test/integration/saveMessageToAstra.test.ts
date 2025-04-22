// /test/integration/saveMessageToAstra.test.ts

import { describe, it, expect } from "vitest";
import { saveMessageToAstra, getMessagesFromAstra } from "@/lib/db/messages";
import { randomUUID } from "crypto";
import type { Message, MessageStatus } from "@/types/message";
import type { Channel } from "@/types/channel";

describe("💾 Guardar mensaje (canal web) en AstraDB", () => {
  const id = `test-web-${randomUUID()}`;
  const hotelId = "hotel123";
  const channel: Channel = "web";
  const status: MessageStatus = "pending";

  it("guarda un mensaje correctamente", async () => {
    const message: Message = {
      id,
      hotelId,
      channel,
      sender: "usuario-web",
      timestamp: new Date().toISOString(),
      content: "¿El desayuno está incluido?",
      suggestion: "Sí, el desayuno está incluido en todas las tarifas.",
      approvedResponse: undefined,
      respondedBy: undefined,
      status,
    };

    await saveMessageToAstra(message);

    const results = await getMessagesFromAstra(hotelId, channel);
    const saved = results.find((m) => m.id === id);

    expect(saved).toBeDefined();
    expect(saved?.hotelId).toBe(hotelId);
    expect(saved?.channel).toBe(channel);
    expect(saved?.sender).toBe("usuario-web");
    expect(saved?.content).toBe("¿El desayuno está incluido?");
    expect(saved?.status).toBe(status);
  });
});

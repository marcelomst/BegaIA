import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndMapMessagesWithSubject } from "@/utils/fetchAndMapMessagesWithSubject";

describe("fetchAndMapMessagesWithSubject rich mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("conserva rich en mensajes assistant y mantiene mensajes sin rich", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => ({
        subject: "Habitaciones",
        messages: [
          {
            sender: "assistant",
            suggestion: "Estas son las habitaciones disponibles.",
            timestamp: "2026-07-09T10:00:00.000Z",
            status: "sent",
            messageId: "msg-ai-rich-1",
            conversationId: "conv-rich-1",
            rich: {
              type: "room-info-img",
              data: [
                { type: "Single Standard", images: ["/hotel999/rooms/single/single.jpg"] },
                { type: "Doble", images: ["/hotel999/rooms/double/double.jpg"] },
              ],
            },
          },
          {
            sender: "guest",
            content: "Gracias",
            timestamp: "2026-07-09T10:01:00.000Z",
            messageId: "msg-user-1",
            conversationId: "conv-rich-1",
          },
        ],
      }),
    } as Response);

    const { messages, subject } = await fetchAndMapMessagesWithSubject("web", "conv-rich-1", "hotel999");

    expect(subject).toBe("Habitaciones");
    expect(messages[0].rich?.type).toBe("room-info-img");
    expect(messages[0].rich?.data).toHaveLength(2);
    expect(messages[1].rich).toBeUndefined();
  });
});

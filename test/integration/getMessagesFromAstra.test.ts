import { describe, it, expect } from "vitest";
import { getMessagesFromAstra } from "@/lib/db/messages";

describe("getMessagesFromAstra (Astra DB)", () => {
  it("recupera los mensajes del hotel123 para el canal web", async () => {
    const hotelId = "hotel123";
    const channel = "web";

    const messages = await getMessagesFromAstra(hotelId, "web");

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);

    const sample = messages[0];
    expect(sample).toHaveProperty("hotelId", hotelId);
    expect(sample).toHaveProperty("channel", channel);
    expect(sample).toHaveProperty("content");
    expect(sample).toHaveProperty("timestamp");
  });
});

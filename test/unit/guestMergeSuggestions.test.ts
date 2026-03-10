// Path: /root/begasist/test/unit/guestMergeSuggestions.test.ts
import { describe, expect, it } from "vitest";
import { buildGuestMergeSuggestions } from "@/lib/utils/guestMergeSuggestions";

describe("buildGuestMergeSuggestions", () => {
  it("sugiere merge entre guests activos con actividad cercana y canales complementarios", () => {
    const suggestions = buildGuestMergeSuggestions([
      {
        guestId: "guest-whatsapp-1",
        name: "Marcelo Martinez",
        aliases: ["whatsapp:+59891359375"],
        channels: ["whatsapp"],
        conversationCount: 3,
        lastActivityAt: "2026-03-10T10:00:00.000Z",
        createdAt: "2026-03-10T09:50:00.000Z",
        updatedAt: "2026-03-10T10:00:00.000Z",
        absorbed: false,
      },
      {
        guestId: "guest-web-1",
        name: null,
        aliases: ["web:session_abc"],
        channels: ["web"],
        conversationCount: 1,
        lastActivityAt: "2026-03-10T10:08:00.000Z",
        createdAt: "2026-03-10T10:05:00.000Z",
        updatedAt: "2026-03-10T10:08:00.000Z",
        absorbed: false,
      },
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      primaryGuestId: "guest-whatsapp-1",
      secondaryGuestId: "guest-web-1",
      severity: "high",
    });
    expect(suggestions[0].signals).toEqual(
      expect.arrayContaining(["actividad muy cercana", "canales distintos", "uno sin nombre", "aliases complementarios"]),
    );
  });

  it("no sugiere guests absorbidos ni pares con ruido insuficiente", () => {
    const suggestions = buildGuestMergeSuggestions([
      {
        guestId: "guest-visible-1",
        name: "Visible",
        aliases: ["whatsapp:+59811111111"],
        channels: ["whatsapp"],
        conversationCount: 2,
        lastActivityAt: "2026-03-10T10:00:00.000Z",
        createdAt: "2026-03-10T09:00:00.000Z",
        updatedAt: "2026-03-10T10:00:00.000Z",
        absorbed: false,
      },
      {
        guestId: "guest-absorbed-1",
        name: "Absorbed",
        aliases: ["web:session_xyz"],
        channels: ["web"],
        conversationCount: 1,
        lastActivityAt: "2026-03-10T10:05:00.000Z",
        createdAt: "2026-03-10T10:04:00.000Z",
        updatedAt: "2026-03-10T10:05:00.000Z",
        absorbed: true,
      },
      {
        guestId: "guest-unrelated-1",
        name: "Otro",
        aliases: ["email:other@example.com"],
        channels: ["email"],
        conversationCount: 1,
        lastActivityAt: "2026-03-01T10:05:00.000Z",
        createdAt: "2026-03-01T10:04:00.000Z",
        updatedAt: "2026-03-01T10:05:00.000Z",
        absorbed: false,
      },
    ]);

    expect(suggestions).toHaveLength(0);
  });
});

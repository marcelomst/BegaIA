// Path: /root/begasist/test/integration/api_chat.test.ts
import { describe, it, expect } from "vitest";
import { POST as chatPOST } from "@/app/api/chat/route";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

function makeReq(body: any) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/chat (integration)", () => {
  it("crea un turno público efímero sin exponer identificadores recuperables", async () => {
    const r = await chatPOST(
      makeReq({
        query: "Hola, ¿me ayudás?",
        channel: "web",
        hotelId: "hotel999",
      })
    );
    expect(r.ok).toBe(true);
    const json = await r.json();

    expect(["sent", "pending"]).toContain(json.status);
    expect(json).toMatchObject({ ephemeral: true, continuationAvailable: false });
    expect(json).not.toHaveProperty("conversationId");
    expect(json.message).not.toHaveProperty("messageId");
  }, 15000);

  it("rechaza continuidad e identidad presentadas por caller público", async () => {
    const conversationAttempt = await chatPOST(
      makeReq({
        query: "Continuar",
        channel: "web",
        hotelId: "hotel999",
        conversationId: "conv-chat-2",
      })
    );
    const guestAttempt = await chatPOST(
      makeReq({
        query: "Adoptar alias",
        channel: "web",
        hotelId: "hotel999",
        guestId: "guest-known",
      })
    );

    expect(conversationAttempt.status).toBe(403);
    expect(guestAttempt.status).toBe(403);
  });

  it("flujo supervisado: retorna pending", async () => {
    (getHotelConfig as any).mockResolvedValueOnce({
      hotelId: "hotel999",
      defaultLanguage: "es",
      channelConfigs: { web: { mode: "supervised", enabled: true } },
    });

    const r = await chatPOST(
      makeReq({
        query: "¿Podés proponer una respuesta?",
        channel: "web",
        hotelId: "hotel999",
      })
    );
    const json = await r.json();

    expect(json.status ?? json.message?.status).toBe("pending");
    expect(json.message?.suggestion ?? json.response ?? json.suggestion).toBeTruthy();
  });
});

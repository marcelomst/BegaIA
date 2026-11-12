// Path: /root/begasist/test/integration/api_chat.test.ts
import { describe, it, expect } from "vitest";
import { POST as chatPOST } from "@/app/api/chat/route";

function makeReq(body: any) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/chat unauthorized boundary (integration)", () => {
  it("rechaza un turno público sin capacidad Guest", async () => {
    const r = await chatPOST(
      makeReq({
        query: "Hola, ¿me ayudás?",
        channel: "web",
        hotelId: "hotel999",
      })
    );
    expect(r.status).toBe(401);
    const json = await r.json();
    expect(json.code).toBe("guest_capability_required");
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

    expect(conversationAttempt.status).toBe(401);
    expect(guestAttempt.status).toBe(401);
  });
});

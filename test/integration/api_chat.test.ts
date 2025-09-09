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

// Helpers para leer respuestas con distintos shapes
function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = k.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
    if (v !== undefined) return v as T;
  }
  return undefined;
}

describe("/api/chat (integration)", () => {
  it("crea o continúa conversación y devuelve objeto con status y messageId", async () => {
    const r = await chatPOST(
      makeReq({
        query: "Hola, ¿me ayudás?",
        channel: "web",
        hotelId: "hotel999",
        conversationId: "conv-chat-1",
        userId: "u1",
      })
    );
    expect(r.ok).toBe(true);
    const json = await r.json();

    const conversationId =
      pick<string>(json, "conversationId", "data.conversationId", "conversation.id") ?? undefined;
    const message =
      pick<any>(json, "message", "data.message", "response", "result.message") ?? {};
    const status =
      pick<string>(json, "status", "data.status", "result.status", "message.status") ?? undefined;

    expect(conversationId).toBeDefined();
    expect(message?.messageId).toBeDefined();
    expect(["sent", "pending"]).toContain(status);
  });

  it("idempotente: mismo messageId no duplica", async () => {
    const messageId = "msg-fixed-1";
    const r1 = await chatPOST(
      makeReq({
        query: "Primero",
        channel: "web",
        hotelId: "hotel999",
        conversationId: "conv-chat-2",
        userId: "u1",
        messageId,
      })
    );
    const r2 = await chatPOST(
      makeReq({
        query: "Reintento",
        channel: "web",
        hotelId: "hotel999",
        conversationId: "conv-chat-2",
        userId: "u1",
        messageId,
      })
    );

    const j1 = await r1.json();
    const j2 = await r2.json();
    const m1 = pick<any>(j1, "message", "data.message", "response", "result.message") ?? {};
    const m2 = pick<any>(j2, "message", "data.message", "response", "result.message") ?? {};
    expect(m1.messageId).toBeDefined();
    expect(m2.messageId).toBeDefined();
    expect(m1.messageId).toBe(m2.messageId);
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
        conversationId: "conv-chat-3",
        userId: "u1",
      })
    );
    const json = await r.json();
    const message =
      pick<any>(json, "message", "data.message", "response", "result.message") ?? {};
    const status =
      pick<string>(json, "status", "data.status", "result.status", "message.status") ?? undefined;

    expect(status ?? message?.status).toBe("pending");
    expect(message?.suggestion ?? json?.response ?? json?.suggestion).toBeTruthy();
  });
});

// Path: /root/begasist/test/integration/api_messages_by-conversation.test.ts
import { describe, it, expect } from "vitest";
import { GET as byConvGET } from "@/app/api/messages/by-conversation/route";
import { getCollection } from "../mocks/astra";

function makeReq(params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return new Request(`http://localhost/api/messages/by-conversation?${sp.toString()}`, {
    method: "GET",
  }) as any;
}

describe("/api/messages/by-conversation (integration)", () => {
  it("lista mensajes ordenados por timestamp asc", async () => {
    const col = getCollection("messages");
    await col.insertOne({ hotelId: "hotel999", channel: "web", conversationId: "conv-1", messageId: "m1", timestamp: 1 });
    await col.insertOne({ hotelId: "hotel999", channel: "web", conversationId: "conv-1", messageId: "m2", timestamp: 2 });

    // algunas implementaciones piden 'channelId', otras 'channel' o 'hotelId'
    const r = await byConvGET(makeReq({ channelId: "web", channel: "web", hotelId: "hotel999", conversationId: "conv-1" }));
    expect(r.ok).toBe(true);
    const json = await r.json();
    const list = (json.messages ?? json.data?.messages) as any[];
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].messageId).toBe("m1");
    expect(list[1].messageId).toBe("m2");
  });
});

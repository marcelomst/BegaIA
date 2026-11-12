// Path: /home/marcelo/begasist/test/security/p-safe.guest-web.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const channelTurn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  ChannelMessageInputError: class ChannelMessageInputError extends Error {},
  handleChannelMessage: channelTurn,
}));

import { POST as chat } from "@/app/api/chat/route";
import { GET as events } from "@/app/api/web/events/route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("P-SAFE public Guest Web containment", () => {
  beforeEach(() => {
    channelTurn.mockReset();
    channelTurn.mockResolvedValue({
      conversationId: "server-only-conversation",
      status: "sent",
      response: "Respuesta propia",
      rich: undefined,
      lang: "es",
      hotelId: "hotel-a",
      channel: "web",
      messageId: "server-only-message",
    });
  });

  it("rechaza conversationId ajeno antes de cargar contexto", async () => {
    const response = await chat(post({
      hotelId: "hotel-a",
      channel: "web",
      query: "Hola",
      conversationId: "foreign-conversation",
    }));

    expect(response.status).toBe(401);
    expect(channelTurn).not.toHaveBeenCalled();
  });

  it("guestId o alias aportado por cliente no se adopta ni altera bindings", async () => {
    const response = await chat(post({
      hotelId: "hotel-a",
      channel: "web",
      query: "Hola",
      guestId: "known-or-foreign-alias",
    }));

    expect(response.status).toBe(401);
    expect(channelTurn).not.toHaveBeenCalled();
  });

  it("no crea identidad ni binding sin una capacidad Guest", async () => {
    const response = await chat(post({
      hotelId: "hotel-a",
      channel: "web",
      query: "Hola",
      sender: "admin",
      mode: "automatic",
      messageId: "client-message-id",
    }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(channelTurn).not.toHaveBeenCalled();
    expect(body.code).toBe("guest_capability_required");
    expect(body).not.toHaveProperty("conversationId");
  });

  it("SSE queda bloqueado incluso cuando se presenta un conversationId", async () => {
    const response = await events(new Request(
      "http://localhost/api/web/events?conversationId=foreign-conversation",
    ) as any);

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("foreign-conversation");
  });
});

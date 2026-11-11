// Path: test/integration/api_conversation_authorization.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as conversationListGET } from "@/app/api/conversations/list/route";
import { GET as conversationStateGET } from "@/app/api/conversations/state/route";
import { GET as traceHistoryGET } from "@/app/api/conversations/trace-history/route";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCollection } from "../mocks/astra";
import { middleware } from "@/middleware";

function request(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return new NextRequest(`http://localhost${path}?${query.toString()}`, { method: "GET" });
}

const hotelAStaff = {
  userId: "staff-a",
  email: "staff-a@example.com",
  hotelId: "hotel-a",
  hotelName: "Hotel A",
  roleLevel: 10,
};

describe("conversation HTTP tenant authorization", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockResolvedValue(hotelAStaff);
  });

  it("does not expose message history or conversation lists through PUBLIC_PATHS", async () => {
    const [messages, conversations] = await Promise.all([
      middleware(request("/api/messages/by-conversation", {
        hotelId: "hotel-a",
        conversationId: "claimed",
        channelId: "web",
      })),
      middleware(request("/api/conversations/list", {
        hotelId: "hotel-a",
        guestId: "claimed",
      })),
    ]);
    expect(messages.status).toBeGreaterThanOrEqual(300);
    expect(messages.status).toBeLessThan(400);
    expect(conversations.status).toBeGreaterThanOrEqual(300);
    expect(conversations.status).toBeLessThan(400);
    expect(messages.headers.get("location")).toContain("/auth/login");
    expect(conversations.headers.get("location")).toContain("/auth/login");
  });

  it("fails closed for unauthenticated list and trace requests", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const [list, trace] = await Promise.all([
      conversationListGET(request("/api/conversations/list", { hotelId: "hotel-a", channel: "web" })),
      traceHistoryGET(request("/api/conversations/trace-history", { hotelId: "hotel-a" })),
    ]);
    expect(list.status).toBe(401);
    expect(trace.status).toBe(401);
    expect(await list.json()).toEqual({ error: "No autorizado" });
    expect(await trace.json()).toEqual({ ok: false, error: "No autorizado" });
  });

  it("prevents hotel A from reading conversation state belonging to hotel B", async () => {
    await getCollection("conversations").insertOne({
      hotelId: "hotel-b",
      conversationId: "state-secret-b",
      channel: "web",
      guestId: "guest-b",
    });
    const response = await conversationStateGET(request("/api/conversations/state", {
      hotelId: "hotel-b",
      conversationId: "state-secret-b",
    }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
    expect(body).not.toHaveProperty("reservationSlots");
    expect(body).not.toHaveProperty("lastReservation");
  });

  it("prevents a valid hotel A JWT from reading hotel B traces or lists", async () => {
    const [list, trace] = await Promise.all([
      conversationListGET(request("/api/conversations/list", { hotelId: "hotel-b", channel: "web" })),
      traceHistoryGET(request("/api/conversations/trace-history", { hotelId: "hotel-b" })),
    ]);
    expect(list.status).toBe(403);
    expect(trace.status).toBe(403);
    expect(JSON.stringify(await trace.json())).not.toContain("traces");
  });

  it("does not treat a guest JWT or client identifiers as conversation authority", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "guest-a",
      email: "guest-a@example.com",
      hotelId: "hotel-a",
      hotelName: "Hotel A",
      roleLevel: 30,
    });
    const response = await conversationStateGET(request("/api/conversations/state", {
      hotelId: "hotel-a",
      conversationId: "client-claimed-conversation",
      guestId: "guest-a",
    }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "No autorizado" });
  });

  it("preserves the existing inbox role contract for same-hotel standard staff", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "standard-a",
      email: "standard-a@example.com",
      hotelId: "hotel-a",
      hotelName: "Hotel A",
      roleLevel: 29,
    });
    const response = await conversationListGET(request("/api/conversations/list", {
      hotelId: "hotel-a",
      channel: "web",
    }));
    expect(response.status).toBe(200);
  });

  it("allows authenticated same-hotel staff without trusting the request tenant", async () => {
    await getCollection("conversations").insertOne({
      hotelId: "hotel-a",
      conversationId: "state-legitimate-a",
      channel: "web",
      guestId: "guest-a",
    });
    const [list, state, trace] = await Promise.all([
      conversationListGET(request("/api/conversations/list", { hotelId: "hotel-a", channel: "web" })),
      conversationStateGET(request("/api/conversations/state", {
        hotelId: "hotel-a",
        conversationId: "state-legitimate-a",
      })),
      traceHistoryGET(request("/api/conversations/trace-history", { hotelId: "hotel-a" })),
    ]);
    expect(list.status).toBe(200);
    expect(state.status).toBe(200);
    expect(trace.status).toBe(200);
  });
});

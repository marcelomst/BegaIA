// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChannelInbox from "@/components/admin/ChannelInbox";

const mocks = vi.hoisted(() => ({
  fetchAllConversationsByChannel: vi.fn(),
  fetchAndMapMessagesWithSubject: vi.fn(),
  fetchGuest: vi.fn(),
}));

vi.mock("@/utils/fetchAndOrderConversations", () => ({
  fetchAllConversationsByChannel: mocks.fetchAllConversationsByChannel,
}));

vi.mock("@/utils/fetchAndMapMessagesWithSubject", () => ({
  fetchAndMapMessagesWithSubject: mocks.fetchAndMapMessagesWithSubject,
}));

vi.mock("@/utils/fetchGuest", () => ({
  fetchGuest: mocks.fetchGuest,
}));

vi.mock("@/lib/context/UserContext", () => ({
  useCurrentUser: () => ({
    user: { email: "agent@hotel.com", hotelId: "hotel999" },
  }),
}));

describe("ChannelInbox Email supervised send", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    mocks.fetchAllConversationsByChannel.mockReset();
    mocks.fetchAndMapMessagesWithSubject.mockReset();
    mocks.fetchGuest.mockReset();

    mocks.fetchAllConversationsByChannel.mockResolvedValue([
      {
        conversationId: "email-conv-1",
        hotelId: "hotel999",
        channel: "email",
        guestId: "martin@example.com",
        subject: "Reserva",
        startedAt: "2026-07-13T10:00:00.000Z",
        lastUpdatedAt: "2026-07-13T10:01:00.000Z",
        lang: "es",
        status: "active",
      },
    ]);
    mocks.fetchAndMapMessagesWithSubject.mockResolvedValue({
      subject: "Reserva",
      messages: [
        {
          role: "ai",
          text: "Texto sugerido",
          suggestion: "Texto sugerido",
          status: "pending",
          timestamp: "2026-07-13T10:01:00.000Z",
          messageId: "email-pending-1",
          conversationId: "email-conv-1",
          guestId: "martin@example.com",
        },
      ],
    });
    mocks.fetchGuest.mockResolvedValue({
      guestId: "martin@example.com",
      name: "Martín Perez",
      mode: "supervised",
      aliases: ["email:martin@example.com"],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/messages" && init?.method === "POST") {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({}), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  it("usa approve_and_send con channel=email al guardar y enviar una respuesta editada", async () => {
    render(
      <ChannelInbox
        hotelId="hotel999"
        channel="email"
        t={{ channelInbox: {} }}
        initialConversationId="email-conv-1"
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Editar y enviar" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Respuesta editada desde Admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y enviar" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/messages",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const postCall = vi.mocked(global.fetch).mock.calls.find(
      ([url, init]) => String(url) === "/api/messages" && init?.method === "POST",
    );
    expect(postCall).toBeTruthy();
    const payload = JSON.parse(String(postCall?.[1]?.body));
    expect(payload).toEqual({
      action: "approve_and_send",
      messageId: "email-pending-1",
      approvedResponse: "Respuesta editada desde Admin",
      channel: "email",
      respondedBy: "agent@hotel.com",
    });
  });
});

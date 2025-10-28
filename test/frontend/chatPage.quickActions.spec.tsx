// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ChatPage from "@/components/admin/ChatPage";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("hotelId=hotel999"),
}));

describe("ChatPage • Quick actions front-end flow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/conversations/list")) {
        return new Response(JSON.stringify({ conversations: [] }), { status: 200 });
      }
      if (url.startsWith("/api/messages/by-conversation")) {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      if (url.startsWith("/api/chat")) {
        return new Response(
          JSON.stringify({
            response: "Ofrezco disponibilidad mock para la demo.",
            status: "sent",
            conversationId: "conv-frontend-2",
            messageId: "mid-2",
            lang: "es",
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    }));
  });

  it("clicks Buscar disponibilidad and shows room cards mock", async () => {
    render(<ChatPage />);

    // There are two "Buscar disponibilidad" buttons (quick action + dates); click the quick action one
    const allBtns = await screen.findAllByRole("button", { name: /Buscar disponibilidad/i });
    fireEvent.click(allBtns[0]);

    // After clicking, should see the mock room cards title
    await waitFor(() =>
      expect(
        screen.getByText(/Estas son las opciones disponibles para tus fechas/i)
      ).toBeInTheDocument()
    );

    // And at least one Reservar esta button from RoomsCarousel
    expect(await screen.findAllByRole("button", { name: /Reservar esta/i })).not.toHaveLength(0);
  });
});

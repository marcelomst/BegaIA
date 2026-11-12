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
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/guest/web/bootstrap") {
        return new Response(JSON.stringify({
          ok: true,
          capability: "guest-capability-quick",
          conversationId: "conv-frontend-2",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 200 });
      }
      if (url === "/api/guest/web/history") {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      if (url.startsWith("/api/chat")) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer guest-capability-quick");
        return new Response(
          JSON.stringify({
            response: "Estas son las opciones disponibles para tus fechas.",
            status: "sent",
            conversationId: "conv-frontend-2",
            messageId: "mid-2",
            lang: "es",
            rich: {
              type: "room-cards",
              data: [{
                code: "STD",
                name: "Habitación estándar",
                price: 120,
                currency: "USD",
                perks: ["Wi-Fi"],
              }],
            },
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    }));
  });

  it("clicks Buscar disponibilidad and renders room cards returned by the server", async () => {
    render(<ChatPage />);

    // There are two "Buscar disponibilidad" buttons (quick action + dates); click the quick action one
    const allBtns = await screen.findAllByRole("button", { name: /Buscar disponibilidad/i });
    fireEvent.click(allBtns[0]);

    // The response and room cards must come from the authorized /api/chat response.
    await waitFor(() =>
      expect(
        screen.getByText(/Estas son las opciones disponibles para tus fechas/i)
      ).toBeInTheDocument()
    );

    // And at least one Reservar esta button from RoomsCarousel
    expect(await screen.findAllByRole("button", { name: /Reservar esta/i })).not.toHaveLength(0);
  });
});

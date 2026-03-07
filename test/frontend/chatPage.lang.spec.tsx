// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ChatPage from "@/components/admin/ChatPage";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("hotelId=hotel999"),
}));

describe("ChatPage • language changes affect API payload", () => {
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
        // Inspect the body and assert lang field reaches backend
        const body = init?.body && typeof init.body === "string" ? JSON.parse(init.body) : {};
        if (body.lang !== "en") {
          return new Response("Lang not propagated", { status: 400 });
        }
        const storedGuestId = localStorage.getItem("guestId");
        if (!body.guestId || typeof body.guestId !== "string") {
          return new Response("guestId missing", { status: 400 });
        }
        if (body.guestId !== storedGuestId) {
          return new Response("guestId not persisted", { status: 400 });
        }
        if (!String(body.guestId).startsWith("guest-")) {
          return new Response("guestId format invalid", { status: 400 });
        }
        return new Response(JSON.stringify({ response: "ok", status: "sent", conversationId: "conv-3" }), { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    }));
  });

  it("selects English and sends, backend receives lang=en", async () => {
    render(<ChatPage />);

  // Change language to English (select under the form footer)
  const select = await screen.findByRole("combobox");
  fireEvent.change(select, { target: { value: "en" } });

  const textarea = await screen.findByRole("textbox", { name: /Mensaje/i });
    fireEvent.change(textarea, { target: { value: "hello" } });

    const sendBtn = screen.getByRole("button", { name: /Preguntar/i });
    fireEvent.click(sendBtn);

    // If backend receives lang=en it returns 200; otherwise test would throw on fetch 400
    // Also ensure assistant echo appears
    await screen.findByText(/ok/i);
  });
});

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPage from "@/components/admin/ChatPage";

// Mock next/navigation useSearchParams to provide hotelId
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("hotelId=hotel999"),
}));

// Basic fetch mock
const originalFetch = global.fetch;

describe("ChatPage • FAQ front-end flow", () => {
  beforeEach(() => {
    // Clean storage and set default
    if (!(globalThis as any).localStorage) {
      const store: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => { store[k] = String(v); },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
        key: (i: number) => Object.keys(store)[i] ?? null,
        length: 0,
      } as any;
    }
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.startsWith("/api/conversations/list")) {
        return new Response(JSON.stringify({ conversations: [] }), { status: 200 });
      }
      if (url.startsWith("/api/messages/by-conversation")) {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      if (url.startsWith("/api/chat")) {
        // Simulate backend answering the FAQ about Tax ID invoice
        return new Response(
          JSON.stringify({
            response:
              "To obtain an invoice with your Tax ID (RUT), please provide your Tax ID during the check-in process.",
            status: "sent",
            conversationId: "conv-frontend-1",
            messageId: "mid-1",
            lang: "es",
          }),
          { status: 200 }
        );
      }
      return new Response("Not Found", { status: 404 });
    }));

    try { localStorage.clear(); } catch {}
    document.cookie = "conversationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "lang=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });

  afterEach(() => {
    if (originalFetch) global.fetch = originalFetch;
  });

  it("renders, sends a question, and shows the FAQ answer", async () => {
    render(<ChatPage />);

    // Seeded assistant intro should be present
    expect(await screen.findByText(/asistente de reservas/i)).toBeInTheDocument();

  // Type user question
  const textarea = await screen.findByRole("textbox", { name: /Mensaje/i });
    fireEvent.change(textarea, { target: { value: "How do I get an invoice with Tax ID?" } });

    const sendBtn = screen.getByRole("button", { name: /Preguntar/i });
    fireEvent.click(sendBtn);

    // Expect user echo to appear
    expect(await screen.findByText(/How do I get an invoice with Tax ID\?/i)).toBeInTheDocument();

    // Expect assistant answer to render
    await waitFor(() =>
      expect(
        screen.getByText(
          /provide your Tax ID during the check-in process/i
        )
      ).toBeInTheDocument()
    );
  });
});

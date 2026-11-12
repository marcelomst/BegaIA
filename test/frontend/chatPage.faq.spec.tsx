// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatPage from "@/components/admin/ChatPage";
import {
  prepareGuestPendingTurn,
  setGuestConversationBundle,
  setGuestPendingTurnStatus,
} from "@/utils/conversationSession";
import { getScopedSessionKey } from "@/utils/webTabScope";

// Mock next/navigation useSearchParams to provide hotelId
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("hotelId=hotel999"),
}));

// Basic fetch mock
const originalFetch = global.fetch;

function readPendingTurnFromSession(): any | null {
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.includes("guestWebPendingTurn.v1") && !key.includes(":index:")) {
      return JSON.parse(sessionStorage.getItem(key) || "null");
    }
  }
  return null;
}

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
      if (url === "/api/guest/web/bootstrap") {
        return new Response(JSON.stringify({
          ok: true,
          capability: "guest-capability-faq",
          conversationId: "conv-frontend-1",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 200 });
      }
      if (url === "/api/guest/web/history") {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      if (url.startsWith("/api/chat")) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer guest-capability-faq");
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
    try { sessionStorage.clear(); } catch {}
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
    expect(readPendingTurnFromSession()).toBeNull();
    expect(screen.getByRole("button", { name: /Preguntar/i })).toBeEnabled();
  });

  it("preserves one messageId across transport loss and tab reload without retrying", async () => {
    const chatBodies: any[] = [];
    let durableEffects = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/guest/web/bootstrap") {
        return new Response(JSON.stringify({
          capability: "guest-capability-loss",
          conversationId: "conv-loss-1",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url === "/api/guest/web/history") {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      if (url === "/api/chat") {
        chatBodies.push(JSON.parse(String(init?.body || "{}")));
        durableEffects += 1;
        throw new TypeError("response lost after persistence");
      }
      return new Response("Not Found", { status: 404 });
    }));

    const view = render(<ChatPage />);
    const textarea = await screen.findByRole("textbox", { name: /Mensaje/i });
    fireEvent.change(textarea, { target: { value: "turno con respuesta perdida" } });
    fireEvent.click(screen.getByRole("button", { name: /Preguntar/i }));

    await screen.findByText(/envío anterior no pudo confirmarse/i);
    expect(chatBodies).toHaveLength(1);
    expect(durableEffects).toBe(1);
    const pendingBeforeReload = readPendingTurnFromSession();
    expect(pendingBeforeReload).toMatchObject({
      messageId: chatBodies[0].messageId,
      text: "turno con respuesta perdida",
      hotelId: "hotel999",
      conversationId: "conv-loss-1",
      status: "uncertain",
    });
    expect(screen.getByRole("button", { name: /Preguntar/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Preguntar/i }));
    expect(chatBodies).toHaveLength(1);

    view.unmount();
    render(<ChatPage />);
    await screen.findByText(/envío anterior no pudo confirmarse/i);
    expect(chatBodies).toHaveLength(1);
    expect(readPendingTurnFromSession()?.messageId).toBe(pendingBeforeReload.messageId);
    expect(screen.getAllByText("turno con respuesta perdida")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Nueva conversación/i })).toBeDisabled();
  });

  it.each([
    [202, {
      status: "reconciliation_required",
      outcome: "completed_reconciliation_required",
      continuationAvailable: false,
      retry: "do_not_retry",
    }],
    [409, {
      status: "reconciliation_required",
      code: "guest_turn_already_recorded",
      continuationAvailable: false,
      retry: "do_not_retry",
    }],
    [503, {
      code: "server_unavailable",
      error: "temporary failure",
    }],
  ])("keeps the client turn uncertain for HTTP %s", async (status, payload) => {
    let chatCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/guest/web/bootstrap") {
        return new Response(JSON.stringify({
          capability: "guest-capability-uncertain",
          conversationId: "conv-uncertain-1",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url === "/api/chat") {
        chatCalls += 1;
        return new Response(JSON.stringify(payload), { status });
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }));

    render(<ChatPage />);
    const textarea = await screen.findByRole("textbox", { name: /Mensaje/i });
    fireEvent.change(textarea, { target: { value: "turno incierto" } });
    fireEvent.click(screen.getByRole("button", { name: /Preguntar/i }));

    await screen.findByText(/envío anterior no pudo confirmarse/i);
    expect(readPendingTurnFromSession()).toMatchObject({ status: "uncertain", text: "turno incierto" });
    expect(chatCalls).toBe(1);
    expect(screen.queryByText(/respuesta entregada/i)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Mensaje/i })).toBeDisabled();
  });

  it("clears the pending turn after a conclusive client rejection", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/guest/web/bootstrap") {
        return new Response(JSON.stringify({
          capability: "guest-capability-rejected",
          conversationId: "conv-rejected-1",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url === "/api/chat") {
        return new Response(JSON.stringify({ code: "invalid_request" }), { status: 400 });
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }));

    render(<ChatPage />);
    const textarea = await screen.findByRole("textbox", { name: /Mensaje/i });
    fireEvent.change(textarea, { target: { value: "turno rechazado" } });
    fireEvent.click(screen.getByRole("button", { name: /Preguntar/i }));

    await screen.findByText(/solicitud fue rechazada/i);
    expect(readPendingTurnFromSession()).toBeNull();
    expect(screen.getByRole("textbox", { name: /Mensaje/i })).toBeEnabled();
  });

  it.each(["expired", "invalid", "missing"] as const)(
    "recovers an orphan pending with a %s capability state without bootstrapping",
    async (bundleState) => {
      window.name = "begasist:web-tab:chat-orphan";
      const pending = prepareGuestPendingTurn({
        hotelId: "hotel999",
        conversationId: "conv-orphan-chat",
        messageId: "client-message-orphan-chat",
        text: "turno huérfano ChatPage",
      });
      setGuestPendingTurnStatus(pending, "uncertain");
      if (bundleState === "expired") {
        setGuestConversationBundle({
          version: 1,
          hotelId: "hotel999",
          conversationId: "conv-orphan-chat",
          capability: "expired-capability",
          expiresAt: "2020-01-01T00:00:00.000Z",
        });
      } else if (bundleState === "invalid") {
        sessionStorage.setItem(getScopedSessionKey("guestWebConversation.v1"), "{invalid-json");
      }
      const fetchSpy = vi.fn(async () => new Response("unexpected", { status: 500 }));
      vi.stubGlobal("fetch", fetchSpy);

      render(<ChatPage />);

      expect(await screen.findByText(/envío anterior no pudo confirmarse/i)).toBeInTheDocument();
      expect(screen.getByText("turno huérfano ChatPage")).toBeInTheDocument();
      expect(readPendingTurnFromSession()).toMatchObject({
        messageId: "client-message-orphan-chat",
        conversationId: "conv-orphan-chat",
        status: "uncertain",
      });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox", { name: /Mensaje/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Preguntar/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Nueva conversación/i })).toBeDisabled();
    },
  );

  it.each([401, 403])("preserves an uncertain pending when history returns %s", async (status) => {
    window.name = `begasist:web-tab:chat-history-${status}`;
    setGuestConversationBundle({
      version: 1,
      hotelId: "hotel999",
      conversationId: "conv-history-denied",
      capability: "denied-capability",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    const pending = prepareGuestPendingTurn({
      hotelId: "hotel999",
      conversationId: "conv-history-denied",
      messageId: `client-message-history-${status}`,
      text: "turno pendiente con history denegado",
    });
    setGuestPendingTurnStatus(pending, "uncertain");
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/guest/web/history");
      return new Response(JSON.stringify({ error: "unauthorized" }), { status });
    });
    vi.stubGlobal("fetch", fetchSpy);

    render(<ChatPage />);

    expect(await screen.findByText(/envío anterior no pudo confirmarse/i)).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(readPendingTurnFromSession()).toMatchObject({
      messageId: `client-message-history-${status}`,
      status: "uncertain",
    });
    expect(sessionStorage.getItem(getScopedSessionKey("guestWebConversation.v1"))).toBeNull();
    expect(screen.getByRole("button", { name: /Nueva conversación/i })).toBeDisabled();
  });

  it("blocks quick and enriched actions while the recovered pending is uncertain", async () => {
    window.name = "begasist:web-tab:chat-rich-blocked";
    setGuestConversationBundle({
      version: 1,
      hotelId: "hotel999",
      conversationId: "conv-rich-blocked",
      capability: "rich-capability",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    const pending = prepareGuestPendingTurn({
      hotelId: "hotel999",
      conversationId: "conv-rich-blocked",
      messageId: "client-message-rich-blocked",
      text: "turno pendiente antes de acciones",
    });
    setGuestPendingTurnStatus(pending, "uncertain");
    let chatCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/chat") chatCalls += 1;
      return new Response(JSON.stringify({
        messages: [
          {
            role: "assistant",
            content: "acciones",
            timestamp: "2026-11-12T10:00:00.000Z",
            rich: { type: "quick-actions", data: { actions: ["Acción rápida bloqueada"] } },
          },
          {
            role: "assistant",
            content: "habitaciones",
            timestamp: "2026-11-12T10:00:01.000Z",
            rich: {
              type: "room-cards",
              data: [{ code: "STD", name: "Standard", price: 100, currency: "USD", perks: [] }],
            },
          },
        ],
      }), { status: 200 });
    }));

    render(<ChatPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Acción rápida bloqueada" }));
    fireEvent.click(screen.getByRole("button", { name: "Reservar esta" }));

    expect(chatCalls).toBe(0);
    expect(readPendingTurnFromSession()?.messageId).toBe("client-message-rich-blocked");
    expect(screen.getByLabelText("Historial del chat")).toHaveAttribute("aria-disabled", "true");
  });
});

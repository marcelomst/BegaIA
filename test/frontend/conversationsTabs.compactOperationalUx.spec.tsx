// Path: test/frontend/conversationsTabs.compactOperationalUx.spec.tsx
// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import ConversationsTabs from "@/components/admin/ConversationsTabs";
import type { ConversationSummary } from "@/types/channel";

const conversations: ConversationSummary[] = [
  {
    conversationId: "conv-1",
    channel: "web",
    guestId: "guest-1",
    subject: "Reserva Web",
    startedAt: "2026-07-22T20:25:08.498Z",
    lastUpdatedAt: "actividad reciente",
    lang: "es",
    status: "active",
  },
  {
    conversationId: "conv-2",
    channel: "whatsapp",
    guestId: "guest-1",
    subject: "WhatsApp",
    startedAt: "2026-07-22T20:30:00.000Z",
    lastUpdatedAt: "2026-07-22T20:32:00.000Z",
    lang: "es",
    status: "pending",
  },
  {
    conversationId: "conv-other",
    channel: "email",
    guestId: "guest-2",
    subject: "Otro huésped",
    startedAt: "2026-07-22T20:35:00.000Z",
    lastUpdatedAt: "2026-07-22T20:36:00.000Z",
    lang: "es",
    status: "active",
  },
];

describe("ConversationsTabs compact operational UX", () => {
  it("renderiza conversaciones del huésped como chips compactos y conserva selección, conteo y pending", () => {
    const setSelectedConv = vi.fn();
    const setSubject = vi.fn();

    render(
      <ConversationsTabs
        conversations={conversations}
        selectedConv="conv-1"
        setSelectedConv={setSelectedConv}
        setSubject={setSubject}
        selectedGuest="guest-1"
        msgCounts={{ "conv-1": 4, "conv-2": 2 }}
        t={{ channelInbox: { newConv: "Nueva conversación" }, sidebar: { web: "Web", whatsapp: "WhatsApp" } }}
        onNewConversation={vi.fn()}
        pendingConversationIds={new Set(["conv-2"])}
      />,
    );

    expect(screen.getByText("Conversaciones")).toBeInTheDocument();
    expect(screen.getByText("2 para este huésped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Seleccionar conversación Reserva Web/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Seleccionar conversación WhatsApp/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByRole("button", { name: /Otro huésped/i })).not.toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Estado active")).toBeInTheDocument();
    expect(screen.getByText("Estado pending")).toBeInTheDocument();
    expect(screen.getByText("pendiente")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Seleccionar conversación WhatsApp/i }));

    expect(setSelectedConv).toHaveBeenCalledWith("conv-2");
    expect(setSubject).toHaveBeenCalledWith("WhatsApp");
  });
});

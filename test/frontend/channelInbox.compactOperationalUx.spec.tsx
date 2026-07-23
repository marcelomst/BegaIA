// Path: test/frontend/channelInbox.compactOperationalUx.spec.tsx
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

const conversation = {
  conversationId: "conv-1",
  hotelId: "hotel999",
  channel: "web",
  guestId: "guest-1",
  subject: "Reserva",
  startedAt: "2026-07-22T20:25:08.498Z",
  lastUpdatedAt: "actividad reciente",
  lang: "es",
  status: "active",
};

function stubFetchWithState(statePayload: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/admin/guest-profile")) {
        return new Response(
          JSON.stringify({
            guestId: "guest-1",
            guest: { guestId: "guest-1", name: "Martín Perez", mode: "supervised" },
            aliases: ["web:guest-1"],
            channels: ["web"],
            conversationCount: 1,
            lastActivityAt: "actividad reciente",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.startsWith("/api/conversations/state")) {
        return new Response(JSON.stringify(statePayload), {
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
}

describe("ChannelInbox compact operational UX", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mocks.fetchAllConversationsByChannel.mockReset();
    mocks.fetchAndMapMessagesWithSubject.mockReset();
    mocks.fetchGuest.mockReset();

    mocks.fetchAllConversationsByChannel.mockResolvedValue([conversation]);
    mocks.fetchAndMapMessagesWithSubject.mockResolvedValue({
      subject: "Reserva",
      messages: [],
    });
    mocks.fetchGuest.mockResolvedValue({
      guestId: "guest-1",
      name: "Martín Perez",
      mode: "supervised",
      aliases: ["web:guest-1"],
    });
  });

  it("renderiza header compacto y permite expandir detalles técnicos y snapshot", async () => {
    stubFetchWithState({
      reservationSlots: {
        guestName: "Ana Rodríguez",
        roomType: "triple",
        checkIn: "2026-08-25",
        checkOut: "2026-08-27",
        numGuests: 3,
      },
      lastReservation: {
        reservationId: "RES-A365BD",
        channel: "email",
        createdAt: "2026-07-22T20:25:08.498Z",
      },
    });

    render(
      <ChannelInbox
        hotelId="hotel999"
        channel="web"
        t={{ channelInbox: {}, sidebar: { web: "Web" } }}
        initialConversationId="conv-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Martín Perez").length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText("Web")).toBeInTheDocument();
    expect(screen.getByText("Supervisado")).toBeInTheDocument();
    expect(screen.getByText("actividad reciente")).toBeInTheDocument();

    const technicalToggle = screen.getByRole("button", { name: /Detalles técnicos/i });
    expect(technicalToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/conversationId:/i)).not.toBeInTheDocument();

    fireEvent.click(technicalToggle);
    expect(technicalToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/conversationId:/i)).toHaveTextContent("conv-1");

    fireEvent.click(screen.getByRole("button", { name: /conversationId:/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("conv-1");
    });

    const snapshotToggle = await screen.findByRole("button", {
      name: /Reserva confirmada: RES-A365BD/i,
    });
    expect(snapshotToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/Ana Rodríguez/)).toBeInTheDocument();
    expect(screen.queryByText("Titular:")).not.toBeInTheDocument();

    fireEvent.click(snapshotToggle);
    expect(snapshotToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Titular:")).toBeInTheDocument();
    expect(screen.getByText("Ana Rodríguez")).toBeInTheDocument();
    expect(screen.getByText("triple")).toBeInTheDocument();

    fireEvent.click(snapshotToggle);
    expect(snapshotToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Titular:")).not.toBeInTheDocument();
  });

  it("no rompe cuando no existe snapshot confirmado", async () => {
    stubFetchWithState({
      reservationSlots: {
        guestName: "Ana Rodríguez",
      },
      lastReservation: {},
    });

    render(
      <ChannelInbox
        hotelId="hotel999"
        channel="web"
        t={{ channelInbox: {}, sidebar: { web: "Web" } }}
        initialConversationId="conv-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Martín Perez").length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.queryByRole("button", { name: /Reserva confirmada/i })).not.toBeInTheDocument();
  });
});

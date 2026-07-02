// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/lib/context/UserContext", () => ({
  useCurrentUser: vi.fn(() => ({
    user: {
      hotelId: "hotel999",
      defaultLanguage: "es",
    },
  })),
}));

vi.mock("@/lib/config/hotelConfig.client", () => ({
  fetchHotelConfig: vi.fn(),
}));

vi.mock("@/lib/i18n/getDictionary", () => ({
  getDictionary: vi.fn(async () => ({
    sidebar: {
      email: "Email",
      web: "Web",
      whatsapp: "WhatsApp",
      channelManager: "Channel Manager",
      telegram: "Telegram",
      instagram: "Instagram",
      facebook: "Facebook",
      x: "X (Twitter)",
      tiktok: "TikTok",
    },
    channelOverview: {
      title: "Visión general de los canales",
      loading: "Cargando estado de canales...",
      qrReady: "QR listo",
      scanQr: "Escaneá este QR",
      status: {
        active: "Activo",
        disabled: "Desactivado",
        supervised: "Supervisado",
        automatic: "Automático",
        connected: "Conectado",
        developing: "En desarrollo",
        waitingQr: "Esperando QR",
        disconnected: "Desconectado",
        notConfigured: "No configurado",
        unknown: "Desconocido",
      },
    },
    channelPanel: {
      supervised: "Supervisado",
      automatic: "Automático",
      reload: "Recargar",
      forceCanonicalQuestion: "Pregunta canónica",
    },
  })),
}));

vi.mock("@/components/admin/ChannelInbox", () => ({
  default: ({ channel }: { channel: string }) => <div data-testid="channel-inbox">{channel}</div>,
}));

vi.mock("@/components/admin/EmailPollingToggle", () => ({
  default: () => <div data-testid="email-polling-toggle" />,
}));

vi.mock("@/components/admin/ModelSelector", () => ({
  default: () => <div data-testid="model-selector" />,
}));

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, disabled }: { checked?: boolean; disabled?: boolean }) => (
    <button
      type="button"
      data-testid="switch"
      data-checked={checked ? "true" : "false"}
      disabled={disabled}
    />
  ),
}));

import ChannelPanel from "@/components/admin/ChannelPanel";
import ChannelOverview from "@/components/admin/ChannelOverview";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";

describe("ChannelPanel per-channel state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads email mode from wrapped hotel config instead of falling back to automatic", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        channelConfigs: {
          email: { mode: "supervised" },
          web: { mode: "automatic" },
          whatsapp: { mode: "automatic" },
        },
      },
    });

    render(<ChannelPanel channel="email" />);

    await screen.findByText("Email");
    await waitFor(() => expect(screen.getByText("Supervisado")).toBeInTheDocument());
    expect(screen.getByText("Supervisado").closest("span")).toHaveClass("bg-yellow-100");
    expect(screen.getByText(/Guía de reservas/)).toBeInTheDocument();
    expect(screen.getByTestId("channel-inbox")).toHaveTextContent("email");
  });

  it("keeps web mode in automatic when that is the configured channel mode", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        channelConfigs: {
          email: { mode: "supervised" },
          web: { mode: "automatic" },
          whatsapp: { mode: "supervised" },
        },
      },
    });

    render(<ChannelPanel channel="web" />);

    await screen.findByText("Web");
    await waitFor(() => expect(screen.getByText("Automático")).toBeInTheDocument());
    expect(screen.getByText("Automático").closest("span")).toHaveClass("bg-green-100");
    expect(screen.queryByText("Supervisado")).not.toBeInTheDocument();
  });

  it("shows an explicit empty state without inherited controls for an unconfigured channel", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: { hotelId: "hotel999", channelConfigs: { web: { enabled: true, mode: "automatic" } } },
    });

    render(<ChannelPanel channel="telegram" />);

    expect(await screen.findByText("No configurado")).toBeInTheDocument();
    expect(screen.queryByTestId("channel-inbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Automático")).not.toBeInTheDocument();
  });

  it("presents Channel Manager as a transactional integration without chat inbox", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        channelConfigs: { channelManager: { enabled: true, mode: "automatic" } },
      },
    });

    render(<ChannelPanel channel="channelManager" />);

    expect(await screen.findByText("Integración transaccional")).toBeInTheDocument();
    expect(screen.getByText(/no es un canal de chat/i)).toBeInTheDocument();
    expect(screen.queryByTestId("channel-inbox")).not.toBeInTheDocument();
  });

  it("unwraps the real hotel config and lists configured and unconfigured channels", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        channelConfigs: {
          web: { enabled: true, mode: "automatic" },
          email: { enabled: false, mode: "supervised" },
          channelManager: { enabled: true, mode: "automatic" },
        },
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ state: "automatic" }),
    })));
    const dictionary = await (await import("@/lib/i18n/getDictionary")).getDictionary("es");

    render(<ChannelOverview hotelId="hotel999" t={dictionary} />);

    expect(await screen.findByText("Visión general de los canales")).toBeInTheDocument();
    expect(screen.getByText("Web")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("🧠 Automático")).toHaveClass("bg-green-100");
    expect(screen.getByText("Integración transaccional")).toHaveClass("bg-amber-100");
    expect(screen.getAllByText("No configurado").length).toBeGreaterThan(0);
    expect(screen.getByText(/integración transaccional para reservas/i)).toBeInTheDocument();
  });
});

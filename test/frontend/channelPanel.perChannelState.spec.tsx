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
    expect(screen.queryByText("Supervisado")).not.toBeInTheDocument();
  });
});

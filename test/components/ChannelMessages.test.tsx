// test/components/ChannelMessages.test.tsx
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChannelMessages from "@/components/admin/ChannelMessages";

// Mocks globales
vi.mock("@/lib/services/webMemory", () => ({
  webMemory: {
    getMessages: () => [
      {
        id: "msg-1",
        sender: "Usuario Web",
        timestamp: new Date("2025-04-17T18:39:58.000Z").toISOString(),
        content: "¿Hasta qué hora es el check-in?",
        suggestion: "El check-in es hasta la 1 pm.",
        approvedResponse: undefined,
        status: "pending",
        edited: false,
      },
    ],
    updateMessage: vi.fn(() => true),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      messages: [
        {
          id: "msg-1",
          sender: "Usuario Web",
          timestamp: new Date("2025-04-17T18:39:58.000Z").toISOString(),
          content: "¿Hasta qué hora es el check-in?",
          suggestion: "El check-in es hasta la 1 pm.",
          approvedResponse: undefined,
          status: "pending",
          edited: false,
        },
      ],
    }),
  })));
});

describe("<ChannelMessages />", () => {
  it("renderiza los mensajes correctamente", async () => {
    render(<ChannelMessages channelId="web" />);
    expect(await screen.findByText(/¿Hasta qué hora es el check-in/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sugerencia del asistente/i)).toBeInTheDocument();
  });

  it("permite editar un mensaje y guardar", async () => {
    render(<ChannelMessages channelId="web" />);

    await screen.findByText(/¿Hasta qué hora es el check-in/i);

    fireEvent.click(screen.getByText("✏️ Editar"));

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Nuevo texto editado" } });

    fireEvent.click(screen.getByText("✅ Guardar"));

    expect(await screen.findByDisplayValue("Nuevo texto editado")).toBeInTheDocument();
  });

  it("permite cancelar la edición de un mensaje", async () => {
    render(<ChannelMessages channelId="web" />);

    await screen.findByText(/¿Hasta qué hora es el check-in/i);

    fireEvent.click(screen.getByText("✏️ Editar"));

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Texto no guardado" } });

    fireEvent.click(screen.getByText("❌ Cancelar"));

    expect(await screen.findByDisplayValue("El check-in es hasta la 1 pm.")).toBeInTheDocument();
  });
});

// /test/components/ChannelMessages.test.tsx

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChannelMessages from "@/components/admin/ChannelMessages";
import type { ChannelMessage, Channel } from "@/types/channel";

function mockFetchResponse(messages: ChannelMessage[]) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ messages }),
  })));
}

const baseMessage = {
  sender: "Usuario Web",
  hotelId: "hotel123",
  channel: "web" as Channel,
  approvedResponse: undefined,
  respondedBy: "sofia@hotel.com",
};

vi.mock("@/lib/services/webMemory", () => ({
  webMemory: {
    getMessages: () => [
      {
        messageId: "msg-1",
        ...baseMessage,
        timestamp: new Date("2025-04-17T18:39:58.000Z").toISOString(),
        content: "¿Hasta qué hora es el check-in?",
        suggestion: "El check-in es hasta la 1 pm.",
        status: "pending",
      },
    ],
    updateMessage: vi.fn(() => true),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockFetchResponse([
    {
      messageId: "msg-1",
      ...baseMessage,
      timestamp: new Date("2025-04-17T18:39:58.000Z").toISOString(),
      content: "¿Hasta qué hora es el check-in?",
      suggestion: "El check-in es hasta la 1 pm.",
      status: "pending",
      time: "",
    },
  ]);
});

describe("<ChannelMessages />", () => {
  const channelId: Channel = "web";
  const userEmail = "sofia@hotel.com";

  it("renderiza los mensajes correctamente", async () => {
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    expect(await screen.findByText(/¿Hasta qué hora es el check-in/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sugerencia del asistente/i)).toBeInTheDocument();
  });

  it("permite editar un mensaje y guardar", async () => {
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    await screen.findByText(/¿Hasta qué hora es el check-in/i);
    fireEvent.click(screen.getByText("✏️ Editar"));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Nuevo texto editado" } });
    fireEvent.click(screen.getByText("✅ Guardar"));
    expect(await screen.findByDisplayValue("Nuevo texto editado")).toBeInTheDocument();
  });

  it("permite cancelar la edición de un mensaje", async () => {
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    await screen.findByText(/¿Hasta qué hora es el check-in/i);
    fireEvent.click(screen.getByText("✏️ Editar"));
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Texto no guardado" } });
    fireEvent.click(screen.getByText("❌ Cancelar"));
    expect(await screen.findByDisplayValue("El check-in es hasta la 1 pm.")).toBeInTheDocument();
  });

  it("muestra correctamente el campo respondedBy", async () => {
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    expect(await screen.findByText(/Respondido por: sofia@hotel.com/i)).toBeInTheDocument();
  });

  it("cambia el estado a 'sent' al hacer clic en '✅ Enviar'", async () => {
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    await screen.findByText(/¿Hasta qué hora es el check-in/i);
    fireEvent.click(screen.getByText("✅ Enviar"));
    expect(await screen.findByText("✅ Enviado")).toBeInTheDocument();
  });

  it("muestra '🔁 Reenviar' si el mensaje ya fue enviado", async () => {
    mockFetchResponse([
      {
        messageId: "msg-2",
        ...baseMessage,
        timestamp: new Date().toISOString(),
        content: "¿Hay estacionamiento?",
        suggestion: "Sí, tenemos estacionamiento gratuito.",
        status: "sent",
        time: ""
      },
    ]);
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    expect(await screen.findByText("🔁 Reenviar")).toBeInTheDocument();
  });

  it("muestra solo 2 mensajes por página y permite paginar", async () => {
    const mockMessages: ChannelMessage[] = Array.from({ length: 4 }).map((_, i) => ({
      messageId: `msg-${i + 1}`,
      ...baseMessage,
      timestamp: new Date(`2025-04-17T1${i}:00:00.000Z`).toISOString(),
      content: `Mensaje número ${i + 1}`,
      suggestion: `Respuesta ${i + 1}`,
      status: "pending",
      time: "",
    }));
    mockMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    mockFetchResponse(mockMessages);

    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    expect(await screen.findByText("Mensaje número 4")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Siguiente/i));
    expect(await screen.findByText("Mensaje número 1")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Anterior/i));
    await waitFor(() => {
      expect(screen.getByText("Mensaje número 4")).toBeInTheDocument();
    });
  });

  it("actualiza el estado a 'rejected' al hacer clic en '❌ Rechazar'", async () => {
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    await screen.findByText(/¿Hasta qué hora es el check-in/i);
    fireEvent.click(screen.getByText("❌ Rechazar"));
    expect(await screen.findByText("❌ Rechazado")).toBeInTheDocument();
  });

  it("permite reenviar un mensaje con '🔁 Reenviar' y muestra '✅ Enviado'", async () => {
    mockFetchResponse([
      {
        messageId: "msg-2",
        ...baseMessage,
        timestamp: new Date().toISOString(),
        content: "¿Hay estacionamiento?",
        suggestion: "Sí, tenemos estacionamiento gratuito.",
        status: "sent",
        time: "",
      },
    ]);
    render(<ChannelMessages channelId={channelId} userEmail={userEmail} mode="supervised" />);
    await screen.findByText("🔁 Reenviar");
    fireEvent.click(screen.getByText("🔁 Reenviar"));
    expect(await screen.findByText("✅ Enviado")).toBeInTheDocument();
  });
});

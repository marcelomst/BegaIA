// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@/lib/config/hotelConfig.client", () => ({
  fetchHotelConfig: vi.fn(),
}));
vi.mock("@/lib/i18n/getDictionary", () => ({
  getDictionary: vi.fn(async () => ({
    hotelEdit: {
      title: "Editar hotel",
      country: "País",
      city: "Ciudad",
      name: "Nombre",
      defaultLanguage: "Idioma",
      timezone: "Zona horaria",
      channelLabels: {},
      enabled: "Habilitado",
      automatic: "Automático",
      supervised: "Supervisado",
    },
  })),
}));

import EditHotelForm from "@/components/admin/EditHotelForm";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";

describe("EditHotelForm assistant branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carga valores existentes, muestra preview y guarda branding custom", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        hotelName: "Hotel Demo",
        defaultLanguage: "es",
        timezone: "UTC",
        country: "",
        city: "",
        address: "",
        postalCode: "",
        phone: "",
        channelConfigs: {},
        reservations: {},
        assistantBranding: {
          displayName: "Vera",
          roleLabel: "la asistente hotelera digital",
        },
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, warnings: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<EditHotelForm hotelId="hotel999" />);

    await screen.findByDisplayValue("Vera");
    expect(screen.getByDisplayValue("la asistente hotelera digital")).toBeInTheDocument();
    expect(screen.getByText("Hola, soy Vera, la asistente hotelera digital de Hotel Demo. ¿Cómo preferís que te llame?")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre del asistente"), { target: { value: "BegaIA" } });
    fireEvent.change(screen.getByLabelText("Rol o presentación del asistente"), { target: { value: "el asistente hotelero digital" } });

    expect(screen.getByText("Hola, soy BegaIA, el asistente hotelero digital de Hotel Demo. ¿Cómo preferís que te llame?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);

    expect(body.hotelId).toBe("hotel999");
    expect(body.updates.assistantBranding).toEqual({
      displayName: "BegaIA",
      roleLabel: "el asistente hotelero digital",
    });
    expect(screen.getByText("Configuración guardada correctamente.")).toBeInTheDocument();
  });

  it("muestra error controlado y no guarda cuando displayName excede el límite", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        hotelName: "Hotel Demo",
        defaultLanguage: "es",
        timezone: "UTC",
        country: "",
        city: "",
        address: "",
        postalCode: "",
        phone: "",
        channelConfigs: {},
        reservations: {},
        assistantBranding: {
          displayName: "Vera",
          roleLabel: "la asistente hotelera digital",
        },
      },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<EditHotelForm hotelId="hotel999" />);

    const displayNameInput = await screen.findByLabelText("Nombre del asistente");
    fireEvent.change(displayNameInput, { target: { value: "V".repeat(61) } });

    expect(screen.getByText("Máximo 60 caracteres para el nombre del asistente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar configuración" })).toBeDisabled();

    fireEvent.submit(document.getElementById("hotel-edit-form") as HTMLFormElement);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("El nombre del asistente no puede superar 60 caracteres.")).toBeInTheDocument();
  });

  it("limpiar ambos campos guarda fallback mediante assistantBranding null", async () => {
    (fetchHotelConfig as any).mockResolvedValue({
      hotel: {
        hotelId: "hotel999",
        hotelName: "Hotel Demo",
        defaultLanguage: "es",
        timezone: "UTC",
        country: "",
        city: "",
        address: "",
        postalCode: "",
        phone: "",
        channelConfigs: {},
        reservations: {},
        assistantBranding: {
          displayName: "Vera",
          roleLabel: "la asistente hotelera digital",
        },
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, warnings: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<EditHotelForm hotelId="hotel999" />);

    fireEvent.change(await screen.findByLabelText("Nombre del asistente"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Rol o presentación del asistente"), { target: { value: "" } });

    expect(screen.getByText("Hola, soy BegaIA, el asistente hotelero digital de Hotel Demo. ¿Cómo preferís que te llame?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.updates.assistantBranding).toBeNull();
  });
});

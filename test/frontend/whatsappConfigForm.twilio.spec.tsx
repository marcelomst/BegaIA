// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import WhatsAppConfigForm from "@/components/admin/WhatsAppConfigForm";

describe("WhatsAppConfigForm Twilio fields", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders twilio fields when provider=twilio and sends payload with new fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const onClose = vi.fn();
    const onSaved = vi.fn();

    render(
      <WhatsAppConfigForm
        hotelId="hotel999"
        initial={{ provider: "twilio" }}
        onClose={onClose}
        onSaved={onSaved}
      />
    );

    expect(screen.getByText("Proveedor")).toBeInTheDocument();
    expect(screen.getByText("Twilio WhatsApp Sender (FROM)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("AC...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("+15558847361")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("+15558847361"), { target: { value: "+15558847361" } });
    fireEvent.change(screen.getByPlaceholderText("AC..."), { target: { value: "AC_TEST_123" } });
    fireEvent.change(screen.getByPlaceholderText("Auth Token"), { target: { value: "token_test_123" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);

    expect(body).toEqual(
      expect.objectContaining({
        hotelId: "hotel999",
        provider: "twilio",
        twilioAccountSid: "AC_TEST_123",
        twilioAuthToken: "token_test_123",
        twilioWhatsAppNumber: "+15558847361",
      }),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides legacy fields by default for twilio and shows them when expanding legacy block", () => {
    render(
      <WhatsAppConfigForm
        hotelId="hotel999"
        initial={{ provider: "twilio" }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("Número (legacy)")).not.toBeVisible();
    expect(screen.getByText("API key (legacy)")).not.toBeVisible();

    fireEvent.click(screen.getByText("Legacy (opcional)"));

    expect(screen.getByText("Número (legacy)")).toBeInTheDocument();
    expect(screen.getByText("API key (legacy)")).toBeInTheDocument();
  });
});

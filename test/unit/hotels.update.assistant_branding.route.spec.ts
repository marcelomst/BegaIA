import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
  updateHotelConfig: vi.fn(),
}));
vi.mock("@/lib/email/resolveEmailCredentials", () => ({
  resolveEmailCredentials: vi.fn(() => ({ source: "none" })),
}));

import { POST } from "@/app/api/hotels/update/route";
import { updateHotelConfig } from "@/lib/config/hotelConfig.server";

describe("hotels update route assistant branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza assistantBranding con patch parcial y preserva el write-path merge-safe", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "Vera",
            roleLabel: "la asistente hotelera digital",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      assistantBranding: {
        displayName: "Vera",
        roleLabel: "la asistente hotelera digital",
      },
    });
  });

  it("trimmea branding custom antes de guardar", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "  Vera  ",
            roleLabel: "  la asistente hotelera digital  ",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      assistantBranding: {
        displayName: "Vera",
        roleLabel: "la asistente hotelera digital",
      },
    });
  });

  it("tolera campos vacíos y limpia assistantBranding", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "   ",
            roleLabel: "",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      assistantBranding: null,
    });
  });

  it("rechaza strings absurdamente largos", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "V".repeat(61),
            roleLabel: "la asistente hotelera digital",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "assistant_branding_display_name_too_long" });
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });

  it("rechaza roleLabel mayor a 120 caracteres y no persiste cambios", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "Vera",
            roleLabel: "r".repeat(121),
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "assistant_branding_role_label_too_long" });
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });
});

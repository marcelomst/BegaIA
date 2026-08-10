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
            avatarVariant: "female",
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
        avatarVariant: "female",
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
            acknowledgementLabel: " Encantada ",
            avatarVariant: " female ",
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
        acknowledgementLabel: "Encantada",
        avatarVariant: "female",
      },
    });
  });

  it("permite guardar solo avatarVariant sin nombre ni rol custom", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "   ",
            roleLabel: "",
            avatarVariant: "male",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      assistantBranding: {
        avatarVariant: "male",
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

  it("si displayName y roleLabel quedan vacíos, limpia también acknowledgementLabel", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "   ",
            roleLabel: "",
            acknowledgementLabel: "Un gusto",
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

  it("acepta acknowledgementLabel dentro de la lista cerrada", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "Vera",
            roleLabel: "la asistente hotelera digital",
            acknowledgementLabel: "Un gusto",
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
        acknowledgementLabel: "Un gusto",
      },
    });
  });

  it("rechaza acknowledgementLabel inválido y no persiste cambios", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "Vera",
            roleLabel: "la asistente hotelera digital",
            acknowledgementLabel: "Encantade",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "assistant_branding_acknowledgement_label_invalid" });
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });

  it("rechaza avatarVariant inválido y no persiste cambios", async () => {
    const req = new Request("http://localhost/api/hotels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: "hotel999",
        updates: {
          assistantBranding: {
            displayName: "Vera",
            roleLabel: "la asistente hotelera digital",
            avatarVariant: "robot",
          },
        },
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "assistant_branding_avatar_variant_invalid" });
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
  updateHotelConfig: vi.fn(),
}));

import { POST } from "@/app/api/config/mode/route";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

describe("/api/config/mode POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setea supervised con respuesta JSON 2xx sin redirect", async () => {
    (getHotelConfig as any).mockResolvedValue({
      channelConfigs: {
        web: { enabled: true, mode: "automatic" },
      },
    });

    const req = new Request("http://localhost/api/config/mode?channel=web&hotelId=hotel999&mode=supervised", {
      method: "POST",
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(json).toEqual({ ok: true, channel: "web", mode: "supervised" });
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      channelConfigs: {
        web: { enabled: true, mode: "supervised" },
      },
    });
  });

  it("es idempotente cuando el modo solicitado ya es supervised", async () => {
    (getHotelConfig as any).mockResolvedValue({
      channelConfigs: {
        web: { enabled: true, mode: "supervised" },
      },
    });

    const req = new Request("http://localhost/api/config/mode?channel=web&hotelId=hotel999&mode=supervised", {
      method: "POST",
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.mode).toBe("supervised");
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      channelConfigs: {
        web: { enabled: true, mode: "supervised" },
      },
    });
    expect(updateHotelConfig).not.toHaveBeenCalledWith("hotel999", {
      channelConfigs: {
        web: { enabled: true, mode: "automatic" },
      },
    });
  });

  it("setea automatic cuando se solicita explícitamente", async () => {
    (getHotelConfig as any).mockResolvedValue({
      channelConfigs: {
        web: { enabled: true, mode: "supervised" },
      },
    });

    const req = new Request("http://localhost/api/config/mode?channel=web&hotelId=hotel999&mode=automatic", {
      method: "POST",
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, channel: "web", mode: "automatic" });
    expect(updateHotelConfig).toHaveBeenCalledWith("hotel999", {
      channelConfigs: {
        web: { enabled: true, mode: "automatic" },
      },
    });
  });

  it("rechaza mode inválido sin mutar configuración", async () => {
    const req = new Request("http://localhost/api/config/mode?channel=web&hotelId=hotel999&mode=foo", {
      method: "POST",
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/modo no permitido/i);
    expect(getHotelConfig).not.toHaveBeenCalled();
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });

  it("rechaza mode ausente sin mutar configuración", async () => {
    const req = new Request("http://localhost/api/config/mode?channel=web&hotelId=hotel999", {
      method: "POST",
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/modo no permitido/i);
    expect(getHotelConfig).not.toHaveBeenCalled();
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });

  it("preserva la validación existente para channel inválido", async () => {
    const req = new Request("http://localhost/api/config/mode?channel=invalid&hotelId=hotel999&mode=automatic", {
      method: "POST",
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/canal no permitido/i);
    expect(getHotelConfig).not.toHaveBeenCalled();
    expect(updateHotelConfig).not.toHaveBeenCalled();
  });
});

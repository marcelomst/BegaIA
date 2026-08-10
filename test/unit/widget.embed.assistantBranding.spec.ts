import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
}));

import { GET } from "@/app/widget/embed/route";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

describe("widget embed assistant branding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publica solo branding visual seguro del asistente para el widget público", async () => {
    vi.mocked(getHotelConfig).mockResolvedValue({
      hotelId: "hotel999",
      hotelName: "Hotel Demo",
      defaultLanguage: "es",
      timezone: "UTC",
      channelConfigs: {},
      assistantBranding: {
        displayName: "Selene",
        roleLabel: "la concierge digital del hotel",
        acknowledgementLabel: "Encantada",
        avatarVariant: "female",
      },
    } as any);

    const res = await GET(new Request("http://localhost/widget/embed?hotel=hotel999&apiBase=http://localhost:3000"));
    const js = await res.text();

    expect(getHotelConfig).toHaveBeenCalledWith("hotel999");
    expect(js).toContain('assistant:');
    expect(js).toContain('"displayName":"Selene"');
    expect(js).toContain('"roleLabel":"la concierge digital del hotel"');
    expect(js).toContain('"avatarVariant":"female"');
    expect(js).toContain('s.src="http://localhost:3000/widget/begai-chat.js"');
    expect(js).not.toContain("s.src:");
    expect(js).not.toContain("acknowledgementLabel");
    expect(js).not.toContain("channelConfigs");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("publica avatarVariant male cuando está configurado", async () => {
    vi.mocked(getHotelConfig).mockResolvedValue({
      hotelId: "hotel999",
      hotelName: "Hotel Demo",
      defaultLanguage: "es",
      timezone: "UTC",
      channelConfigs: {},
      assistantBranding: {
        displayName: "Bruno",
        roleLabel: "el concierge digital del hotel",
        avatarVariant: "male",
      },
    } as any);

    const res = await GET(new Request("http://localhost/widget/embed?hotel=hotel999&apiBase=http://localhost:3000"));
    const js = await res.text();

    expect(js).toContain('"displayName":"Bruno"');
    expect(js).toContain('"roleLabel":"el concierge digital del hotel"');
    expect(js).toContain('"avatarVariant":"male"');
    expect(js).toContain('s.src="http://localhost:3000/widget/begai-chat.js"');
  });

  it("omite avatarVariant cuando no está configurado para preservar hoteles legacy", async () => {
    vi.mocked(getHotelConfig).mockResolvedValue({
      hotelId: "hotel999",
      hotelName: "Hotel Demo",
      defaultLanguage: "es",
      timezone: "UTC",
      channelConfigs: {},
      assistantBranding: undefined,
    } as any);

    const res = await GET(new Request("http://localhost/widget/embed?hotel=hotel999"));
    const js = await res.text();

    expect(js).toContain('"displayName":"BegaIA"');
    expect(js).toContain('"roleLabel":"el asistente hotelero digital"');
    expect(js).not.toContain("avatarVariant");
  });
});

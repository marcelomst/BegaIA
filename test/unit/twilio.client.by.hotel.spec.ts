// Path: /root/begasist/test/unit/twilio.client.by.hotel.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getHotelConfigMock = vi.fn();
const ENV_KEYS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"] as const;
let envBackup: Record<string, string | undefined>;

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));

describe("getTwilioClientForHotel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envBackup = Object.fromEntries(
      ENV_KEYS.map((k) => [k, process.env[k]])
    );
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      const v = envBackup[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("uses DB-first creds/from when present in hotel_config", async () => {
    getHotelConfigMock.mockResolvedValueOnce({
      channelConfigs: {
        whatsapp: {
          twilioAccountSid: "AC_DB",
          twilioAuthToken: "AUTH_DB",
          twilioFrom: "whatsapp:+59811111111",
        },
      },
    });
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_ENV");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "AUTH_ENV");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "whatsapp:+59899999999");

    const { getTwilioClientForHotel } = await import("@/lib/channels/whatsapp/getTwilioClientForHotel");
    const result = await getTwilioClientForHotel("hotel999");

    expect(result).toEqual({
      client: {
        accountSid: "AC_DB",
        authToken: "AUTH_DB",
      },
      from: "whatsapp:+59811111111",
    });
  });

  it("falls back to env when DB creds/from are missing", async () => {
    getHotelConfigMock.mockResolvedValueOnce({
      channelConfigs: {
        whatsapp: {},
      },
    });
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_ENV");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "AUTH_ENV");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "+59899999999");

    const { getTwilioClientForHotel } = await import("@/lib/channels/whatsapp/getTwilioClientForHotel");
    const result = await getTwilioClientForHotel("hotel999");

    expect(result).toEqual({
      client: {
        accountSid: "AC_ENV",
        authToken: "AUTH_ENV",
      },
      from: "whatsapp:+59899999999",
    });
  });
});

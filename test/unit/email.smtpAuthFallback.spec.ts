import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectMock,
  createTransportMock,
  redisStore,
  redisMock,
} = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    connectMock: vi.fn(),
    createTransportMock: vi.fn(),
    redisStore: store,
    redisMock: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string, ...args: any[]) => {
        if (args.includes("NX") && store.has(key)) return null;
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
        return 1;
      }),
    },
  };
});

vi.mock("imap-simple", () => ({
  default: {
    connect: connectMock,
  },
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

vi.mock("@/lib/services/redis", () => ({
  redis: redisMock,
}));

describe("email SMTP auth fallback", () => {
  beforeEach(() => {
    redisStore.clear();
    vi.clearAllMocks();
    process.env.EMAIL_PASS = "env-fallback-pass";
    process.env.EMAIL_SENDING_ENABLED = "true";
  });

  it("recrea el transporter SMTP con EMAIL_PASS cuando IMAP entra por fallback", async () => {
    const intervalSpy = vi.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    const connection = {
      openBox: vi.fn(async () => undefined),
      end: vi.fn(async () => undefined),
      imap: { end: vi.fn() },
    };
    connectMock
      .mockRejectedValueOnce(Object.assign(new Error("Invalid credentials (Failure)"), { textCode: "AUTHENTICATIONFAILED" }))
      .mockResolvedValueOnce(connection);
    createTransportMock
      .mockReturnValueOnce({ sendMail: vi.fn() })
      .mockReturnValueOnce({ sendMail: vi.fn() });

    try {
      const { startEmailBot } = await import("@/lib/services/email");

      await startEmailBot({
        hotelId: "hotel-smtp-fallback-1",
        emailConf: {
          dirEmail: "hotel@example.com",
          imapHost: "imap.gmail.com",
          imapPort: 993,
          smtpHost: "smtp.gmail.com",
          smtpPort: 587,
          secure: false,
          password: "inline-legacy-pass",
          enabled: true,
          mode: "automatic",
        } as any,
      });

      expect(connectMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          imap: expect.objectContaining({
            password: "inline-legacy-pass",
          }),
        }),
      );
      expect(connectMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          imap: expect.objectContaining({
            password: "env-fallback-pass",
          }),
        }),
      );
      expect(createTransportMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          auth: {
            user: "hotel@example.com",
            pass: "inline-legacy-pass",
          },
        }),
      );
      expect(createTransportMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          auth: {
            user: "hotel@example.com",
            pass: "env-fallback-pass",
          },
        }),
      );
    } finally {
      intervalSpy.mockRestore();
      delete process.env.EMAIL_PASS;
      delete process.env.EMAIL_SENDING_ENABLED;
    }
  });
});

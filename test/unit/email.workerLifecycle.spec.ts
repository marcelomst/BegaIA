import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectMock,
  createTransportMock,
  heartbeatMock,
  redisStore,
  redisMock,
} = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    connectMock: vi.fn(),
    createTransportMock: vi.fn(),
    heartbeatMock: {
      startChannelHeartbeat: vi.fn(),
      stopChannelHeartbeat: vi.fn(),
    },
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
      eval: vi.fn(async (_script: string, _keyCount: number, key: string, lockToken: string) => {
        if (store.get(key) !== lockToken) return 0;
        store.delete(key);
        return 1;
      }),
    },
  };
});

vi.mock("imap-simple", () => ({ default: { connect: connectMock } }));
vi.mock("nodemailer", () => ({ default: { createTransport: createTransportMock } }));
vi.mock("@/lib/services/redis", () => ({ redis: redisMock }));
vi.mock("@/lib/services/heartbeat", () => heartbeatMock);

import {
  acquireEmailBotLock,
  startEmailBot,
  stopAllEmailBotRuntimes,
} from "@/lib/services/email";

describe("email worker shutdown lifecycle", () => {
  beforeEach(() => {
    redisStore.clear();
    vi.clearAllMocks();
    createTransportMock.mockReturnValue({ sendMail: vi.fn() });
  });

  afterEach(async () => {
    await stopAllEmailBotRuntimes("test_cleanup");
  });

  it("libera su lock al apagarse y permite reiniciar otro worker inmediatamente", async () => {
    const intervalSpy = vi.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    const connection = {
      openBox: vi.fn(async () => undefined),
      end: vi.fn(async () => undefined),
    };
    connectMock.mockResolvedValueOnce(connection);

    try {
      await startEmailBot({
        hotelId: "hotel-restart-1",
        emailConf: {
          dirEmail: "hotel@example.com",
          imapHost: "imap.example.com",
          smtpHost: "smtp.example.com",
          password: "secret",
          enabled: true,
        } as any,
      });

      await expect(acquireEmailBotLock("hotel-restart-1", "other-worker")).resolves.toBe(false);

      await stopAllEmailBotRuntimes("signal_SIGTERM");

      expect(connection.end).toHaveBeenCalledOnce();
      await expect(acquireEmailBotLock("hotel-restart-1", "other-worker")).resolves.toBe(true);
    } finally {
      intervalSpy.mockRestore();
    }
  });

  it("libera el lock propio si IMAP falla antes de registrar el runtime", async () => {
    connectMock.mockRejectedValueOnce(new Error("IMAP unavailable"));

    await expect(startEmailBot({
      hotelId: "hotel-startup-error-1",
      emailConf: {
        dirEmail: "hotel@example.com",
        imapHost: "imap.example.com",
        smtpHost: "smtp.example.com",
        password: "secret",
        enabled: true,
      } as any,
    })).rejects.toThrow("IMAP unavailable");

    await expect(acquireEmailBotLock("hotel-startup-error-1", "next-worker")).resolves.toBe(true);
  });

  it("no promueve un startup cancelado mientras IMAP sigue conectando", async () => {
    const connection = {
      openBox: vi.fn(async () => undefined),
      end: vi.fn(async () => undefined),
    };
    let resolveConnect: ((connection: { openBox: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }) => void) | undefined;
    connectMock.mockReturnValueOnce(new Promise<{ openBox: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }>((resolve) => {
      resolveConnect = resolve;
    }));

    const startPromise = startEmailBot({
      hotelId: "hotel-cancelled-startup-1",
      emailConf: {
        dirEmail: "hotel@example.com",
        imapHost: "imap.example.com",
        smtpHost: "smtp.example.com",
        password: "secret",
        enabled: true,
      } as any,
    });

    await vi.waitFor(() => expect(connectMock).toHaveBeenCalledOnce());
    await stopAllEmailBotRuntimes("signal_SIGTERM");
    await expect(acquireEmailBotLock("hotel-cancelled-startup-1", "worker-b")).resolves.toBe(true);

    resolveConnect?.(connection);
    await startPromise;

    expect(connection.end).toHaveBeenCalledOnce();
    expect(heartbeatMock.startChannelHeartbeat).not.toHaveBeenCalled();
    expect(redisStore.get("email_bot_lock:hotel-cancelled-startup-1")).toBe("worker-b");
  });
});

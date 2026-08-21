import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redisStore,
  redisMock,
} = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
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

vi.mock("@/lib/services/redis", () => ({
  redis: redisMock,
}));

import {
  acquireEmailBotLock,
  buildEmailLegacySearchCriteria,
  getEmailWorkerMode,
  limitLegacyMessages,
  shouldAutoEnableEmailPollingOnStartup,
  shouldKeepEmailRuntimeAliveAfterBatch,
  refreshEmailBotLock,
  releaseEmailBotLock,
  markEmailProcessed,
} from "@/lib/services/email";

describe("email polling shutdown helpers", () => {
  beforeEach(() => {
    redisStore.clear();
    vi.clearAllMocks();
  });

  it("mantiene lock unico por hotelId", async () => {
    await expect(acquireEmailBotLock("hotel-lock-1", "token-a")).resolves.toBe(true);
    await expect(acquireEmailBotLock("hotel-lock-1", "token-b")).resolves.toBe(false);
    await expect(refreshEmailBotLock("hotel-lock-1", "token-a")).resolves.toBe(true);
    await expect(refreshEmailBotLock("hotel-lock-1", "token-b")).resolves.toBe(false);

    await releaseEmailBotLock("hotel-lock-1", "token-a");
    await expect(acquireEmailBotLock("hotel-lock-1", "token-b")).resolves.toBe(true);
  });

  it("no permite que un token ajeno libere el lock del owner", async () => {
    await expect(acquireEmailBotLock("hotel-lock-owner-1", "token-owner")).resolves.toBe(true);

    await releaseEmailBotLock("hotel-lock-owner-1", "token-ajeno");

    expect(redisStore.get("email_bot_lock:hotel-lock-owner-1")).toBe("token-owner");
    await expect(acquireEmailBotLock("hotel-lock-owner-1", "token-ajeno")).resolves.toBe(false);
  });

  it("usa compare-and-delete atomico y no borra un lock renovado por otro worker", async () => {
    const key = "email_bot_lock:hotel-lock-atomic-1";
    redisStore.set(key, "token-a");
    redisMock.eval.mockImplementationOnce(async () => {
      // A competing atomic write won before this release script executed.
      redisStore.set(key, "token-b");
      return 0;
    });

    await expect(releaseEmailBotLock("hotel-lock-atomic-1", "token-a")).resolves.toBe(false);

    expect(redisMock.eval).toHaveBeenCalledOnce();
    expect(redisMock.del).not.toHaveBeenCalled();
    expect(redisStore.get(key)).toBe("token-b");
  });

  it("marca \\Seen y RAGBOT_PROCESSED en fallback", async () => {
    const connection = {
      addFlags: vi
        .fn()
        .mockRejectedValueOnce(new Error("array flags not supported"))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
    };

    await markEmailProcessed(connection, 42);

    expect(connection.addFlags).toHaveBeenNthCalledWith(1, 42, ["\\Seen", "RAGBOT_PROCESSED"]);
    expect(connection.addFlags).toHaveBeenNthCalledWith(2, 42, "\\Seen");
    expect(connection.addFlags).toHaveBeenNthCalledWith(3, 42, "RAGBOT_PROCESSED");
  });

  it("acota la query legacy con SINCE en safe mode", () => {
    const criteria = buildEmailLegacySearchCriteria(
      new Date("2026-03-13T12:00:00.000Z"),
      { safeMode: true, lookbackDays: 2, maxMessages: 10, allowedSenders: [] },
    );

    expect(criteria).toContain("UNSEEN");
    expect(criteria).toContainEqual(["UNKEYWORD", "RAGBOT_PROCESSED"]);
    expect(criteria).toContainEqual(["SINCE", "11-Mar-2026"]);
  });

  it("mantiene modo once por defecto para no cambiar runtime productivo", () => {
    delete process.env.EMAIL_WORKER_MODE;

    expect(getEmailWorkerMode()).toBe("once");
    expect(shouldKeepEmailRuntimeAliveAfterBatch()).toBe(false);
  });

  it("permite modo watch para dev:email sin apagar polling tras cada batch", () => {
    process.env.EMAIL_WORKER_MODE = "watch";

    try {
      expect(getEmailWorkerMode()).toBe("watch");
      expect(shouldKeepEmailRuntimeAliveAfterBatch()).toBe(true);
      expect(shouldAutoEnableEmailPollingOnStartup()).toBe(true);
    } finally {
      delete process.env.EMAIL_WORKER_MODE;
    }
  });

  it("no auto-activa polling en once ni cuando el canal email esta deshabilitado", () => {
    expect(shouldAutoEnableEmailPollingOnStartup("once", true)).toBe(false);
    expect(shouldAutoEnableEmailPollingOnStartup("watch", false)).toBe(false);
  });

  it("no rompe el canal si el proveedor rechaza la keyword custom y conserva \\Seen", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const connection = {
      addFlags: vi
        .fn()
        .mockRejectedValueOnce(new Error("Unable to parse flag \\RAGBOT_PROCESSED"))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Unable to parse flag \\RAGBOT_PROCESSED")),
    };

    await expect(markEmailProcessed(connection, 77)).resolves.toBeUndefined();

    expect(connection.addFlags).toHaveBeenNthCalledWith(1, 77, ["\\Seen", "RAGBOT_PROCESSED"]);
    expect(connection.addFlags).toHaveBeenNthCalledWith(2, 77, "\\Seen");
    expect(connection.addFlags).toHaveBeenNthCalledWith(3, 77, "RAGBOT_PROCESSED");
    expect(warnSpy).toHaveBeenCalledWith(
      "[email] Keyword IMAP no soportada para UID 77. Se conserva fallback con \\Seen.",
    );

    warnSpy.mockRestore();
  });

  it("no traga errores genericos sin referencia a RAGBOT_PROCESSED", async () => {
    const connection = {
      addFlags: vi
        .fn()
        .mockRejectedValueOnce(new Error("array flags not supported"))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("invalid arguments")),
    };

    await expect(markEmailProcessed(connection, 88)).rejects.toThrow("invalid arguments");
    expect(connection.addFlags).toHaveBeenNthCalledWith(3, 88, "RAGBOT_PROCESSED");
  });

  it("no traga errores de conexion aunque mencionen flag de forma inespecifica", async () => {
    const connection = {
      addFlags: vi
        .fn()
        .mockRejectedValueOnce(new Error("array flags not supported"))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("connection failed while setting flag")),
    };

    await expect(markEmailProcessed(connection, 99)).rejects.toThrow("connection failed while setting flag");
    expect(connection.addFlags).toHaveBeenNthCalledWith(3, 99, "RAGBOT_PROCESSED");
  });

  it("limita mensajes legacy al subconjunto mas reciente", () => {
    const messages = [
      { attributes: { uid: 10 } },
      { attributes: { uid: 50 } },
      { attributes: { uid: 20 } },
      { attributes: { uid: 40 } },
    ];

    const result = limitLegacyMessages(
      messages as any[],
      { safeMode: true, lookbackDays: 1, maxMessages: 2, allowedSenders: [] },
    );

    expect(result.map((msg) => msg.attributes.uid)).toEqual([40, 50]);
  });
});

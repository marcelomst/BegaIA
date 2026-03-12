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
    },
  };
});

vi.mock("@/lib/services/redis", () => ({
  redis: redisMock,
}));

import {
  acquireEmailBotLock,
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
});

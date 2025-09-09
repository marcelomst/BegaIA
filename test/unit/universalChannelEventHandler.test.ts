// Path: test/unit/universalChannelEventHandler.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist de los mocks para evitar el “before initialization”
const mhSpy = vi.hoisted(() => vi.fn(async () => {}));
const guardSpy = vi.hoisted(() => vi.fn(async () => ({ applied: true })));

// Mockeamos justo lo que importa en estos tests
vi.mock("@/lib/handlers/messageHandler", () => ({
  handleIncomingMessage: mhSpy,
}));
vi.mock("@/lib/db/messageGuards", () => ({
  guardInboundOnce: guardSpy,
}));

import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";

describe("universalChannelEventHandler (unit)", () => {
  beforeEach(() => {
    mhSpy.mockClear();
    guardSpy.mockReset().mockResolvedValue({ applied: true });
  });

  it("normaliza eventos web/email/whatsapp y delega en handleIncomingMessage", async () => {
    const base = {
      hotelId: "hotel999",
      conversationId: "conv-eh",
      from: "guest",
      content: "hola",
      timestamp: Date.now(),
    };

    await universalChannelEventHandler(
      { ...base, channel: "web",      sourceMsgId: "web-1" } as any,
      { mode: "automatic" }
    );
    await universalChannelEventHandler(
      { ...base, channel: "email",    sourceMsgId: "em-1" } as any,
      { mode: "automatic" }
    );
    await universalChannelEventHandler(
      { ...base, channel: "whatsapp", sourceMsgId: "wa-1" } as any,
      { mode: "automatic" }
    );

    expect(mhSpy).toHaveBeenCalledTimes(3);

    // chequeamos normalización de uno (valen para los tres)
    const call0 = (mhSpy as any).mock.calls[0] as any[];
    const msgArg = call0[0];

    expect(msgArg).toBeTruthy();
    expect(msgArg.hotelId).toBe("hotel999");
    expect(msgArg.role).toBe("user");
    expect(msgArg.direction).toBe("in");
    expect(typeof msgArg.messageId).toBe("string");
    expect(String(msgArg.timestamp)).toContain("T"); // ISO-ish
  });

  it("es idempotente por sourceMsgId (2 llamadas => sólo 1 delega)", async () => {
    const payload: any = {
      hotelId: "hotel999",
      conversationId: "conv-eh-dup",
      channel: "web",
      from: "guest",
      content: "dup",
      timestamp: Date.now(),
      sourceMsgId: "src-1",
    };

    // primera true, segunda false
    guardSpy.mockResolvedValueOnce({ applied: true });
    await universalChannelEventHandler(payload, { mode: "automatic" });

    guardSpy.mockResolvedValueOnce({ applied: false });
    await universalChannelEventHandler(payload, { mode: "automatic" });

    expect(mhSpy).toHaveBeenCalledTimes(1);
  });
});

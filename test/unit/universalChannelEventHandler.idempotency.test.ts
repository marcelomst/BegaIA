// Path: /root/begasist/test/unit/universalChannelEventHandler.idempotency.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ✅ Hoist de los fns que serán usados dentro de vi.mock (evita el ReferenceError)
const { guardMock } = vi.hoisted(() => ({
  guardMock: vi.fn(async () => ({ applied: true })),
}));
const { mhSpy } = vi.hoisted(() => ({
  mhSpy: vi.fn(async () => {}),
}));

// Mocks que usan los fns hoisteados
vi.mock("@/lib/db/messageGuards", () => ({ guardInboundOnce: guardMock }));
vi.mock("@/lib/handlers/messageHandler", () => ({ handleIncomingMessage: mhSpy }));

// Import del SUT después de los mocks
import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";

describe("universalChannelEventHandler", () => {
  beforeEach(() => {
    guardMock.mockReset().mockResolvedValue({ applied: true });
    mhSpy.mockClear();
  });

  it("normaliza un evento y delega al pipeline cuando applied=true", async () => {
    const now = Date.now();
    const out = await universalChannelEventHandler({
      hotelId: "hotel999",
      conversationId: "conv-1",
      channel: "web",
      from: "guest",
      content: "hola",
      timestamp: now,
      sourceMsgId: "web-1",
    } as any);

    expect(out).toEqual({ ok: true, deduped: false });
    expect(mhSpy).toHaveBeenCalledTimes(1);

    // Acceso seguro al primer argumento
    const call0 = (mhSpy as any).mock.calls[0] as any[];
    const msgArg = call0?.[0];
    expect(msgArg).toBeTruthy();
    expect(msgArg.hotelId).toBe("hotel999");
    expect(msgArg.channel).toBe("web");
    expect(msgArg.role).toBe("user");
    expect(msgArg.direction).toBe("in");
    expect(typeof msgArg.messageId).toBe("string");
    expect(String(msgArg.timestamp)).toContain("T"); // ISO-ish
  });

  it("no delega cuando guardInboundOnce.applied=false (dedupe)", async () => {
    guardMock.mockResolvedValueOnce({ applied: false });

    const res = await universalChannelEventHandler({
      hotelId: "hotel999",
      conversationId: "conv-2",
      channel: "email",
      from: "guest",
      content: "dup",
      timestamp: Date.now(),
      sourceMsgId: "em-dup-1",
    } as any);

    expect(res).toEqual({ ok: true, deduped: true });
    expect(mhSpy).not.toHaveBeenCalled();
  });

  it("concurrencia simulada: dos iguales ⇒ sólo 1 delega", async () => {
    guardMock
      .mockResolvedValueOnce({ applied: true })   // primera entra
      .mockResolvedValueOnce({ applied: false }); // segunda dedupe

    const payload = {
      hotelId: "hotel999",
      conversationId: "conv-3",
      channel: "whatsapp" as const,
      from: "guest" as const,
      content: "hola wa",
      timestamp: Date.now(),
      sourceMsgId: "wa-xyz",
    };

    await Promise.all([
      universalChannelEventHandler(payload as any),
      universalChannelEventHandler(payload as any),
    ]);

    expect(mhSpy).toHaveBeenCalledTimes(1);
  });
});

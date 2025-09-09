// Path: /root/begasist/test/unit/messageGuards.lwt.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake de sesión CQL: 1ª vez wasApplied=true, 2ª false para el mismo key
const seen = new Set<string>();
const sessionFake = {
  execute: vi.fn(async (q: string, params: any[]) => {
    const [hotelId, convId, direction, sourceId] =
      q.includes("USING TTL ?") ? params.slice(0, 4) : params; // soporta ambas variantes
    const key = `${hotelId}|${convId}|${direction}|${sourceId}`;
    const applied = !seen.has(key);
    seen.add(key);
    return {
      wasApplied: () => applied,
      rows: [{ "[applied]": applied }],
    };
  }),
};

vi.mock("@/lib/astra/cassandra", () => ({
  getCassandraSession: async () => sessionFake,
}));

import { guardInboundOnce } from "@/lib/db/messageGuards";

describe("messageGuards (LWT)", () => {
  beforeEach(() => {
    seen.clear();
    sessionFake.execute.mockClear();
  });

  it("primera vez applied=true, segunda false para el mismo (hotel, conv, dir, source)", async () => {
    const key = { hotelId: "h1", conversationId: "c1", sourceMsgId: "s1" };

    const a = await guardInboundOnce(key);
    const b = await guardInboundOnce(key);

    expect(a.applied).toBe(true);
    expect(b.applied).toBe(false);
    expect(sessionFake.execute).toHaveBeenCalledTimes(2);
  });
});

// Path: /root/begasist/test/integration/reservations.mcp.multi-hotel-isolation.spec.ts
import { describe, expect, it } from "vitest";
import { POST as mcpPOST } from "@/app/api/mcp/route";

function mkReq(body: unknown): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("MCP reservations multi-hotel isolation", () => {
  it("isolates reservation state between different hotelId values", async () => {
    const now = Date.now();
    const hotelA = `hotelA-${now}`;
    const hotelB = `hotelB-${now}`;

    const createRes = await mcpPOST(
      mkReq({
        action: "call",
        name: "createReservation",
        params: {
          hotelId: hotelA,
          guestName: "QA Multi Hotel",
          roomType: "double",
          checkInDate: "2026-05-10",
          checkOutDate: "2026-05-12",
        },
      }) as any
    );
    const created = await createRes.json();
    expect(created.ok).toBe(true);
    const reservationId = created?.data?.reservationId as string;
    expect(reservationId).toBeTruthy();

    const getFromB1 = await mcpPOST(
      mkReq({
        action: "call",
        name: "getReservation",
        params: { hotelId: hotelB, reservationId },
      }) as any
    );
    const inB1 = await getFromB1.json();
    expect(inB1.ok).toBe(true);
    expect(inB1.data).toBeNull();

    const getFromA = await mcpPOST(
      mkReq({
        action: "call",
        name: "getReservation",
        params: { hotelId: hotelA, reservationId },
      }) as any
    );
    const inA = await getFromA.json();
    expect(inA.ok).toBe(true);
    expect(inA.data?.reservationId).toBe(reservationId);

    const cancelInA = await mcpPOST(
      mkReq({
        action: "call",
        name: "cancelReservation",
        params: { hotelId: hotelA, reservationId },
      }) as any
    );
    const cancelled = await cancelInA.json();
    expect(cancelled.ok).toBe(true);
    expect(cancelled.data?.status).toBe("cancelled");

    const getFromB2 = await mcpPOST(
      mkReq({
        action: "call",
        name: "getReservation",
        params: { hotelId: hotelB, reservationId },
      }) as any
    );
    const inB2 = await getFromB2.json();
    expect(inB2.ok).toBe(true);
    expect(inB2.data).toBeNull();
  });
});

// Path: /root/begasist/test/golden/deliveryPolicy.golden.spec.ts

import { describe, expect, it } from "vitest";
import { decideDeliveryPolicy } from "@/lib/pipeline/deliveryPolicy";

describe("golden • deliveryPolicy invariants", () => {
  it("sent + non-empty response => sends final reply only", () => {
    const out = decideDeliveryPolicy({
      status: "sent",
      response: "hola",
      lang: "es",
    });

    expect(out.shouldSendFinalReply).toBe(true);
    expect(out.finalReplyText).toBe("hola");
    expect(out.shouldSendPendingAck).toBe(false);
    expect(out.pendingAckText).toBeUndefined();
  });

  it("sent + empty response => does not send final reply", () => {
    const out = decideDeliveryPolicy({
      status: "sent",
      response: "   ",
      lang: "es",
    });

    expect(out.shouldSendFinalReply).toBe(false);
    expect(out.finalReplyText).toBeUndefined();
    expect(out.shouldSendPendingAck).toBe(false);
  });

  it("pending + ack enabled => sends pending ack", () => {
    const out = decideDeliveryPolicy({
      status: "pending",
      response: "irrelevant",
      lang: "es",
      pendingAckEnabled: true,
    });

    expect(out.shouldSendFinalReply).toBe(false);
    expect(out.shouldSendPendingAck).toBe(true);
    expect(typeof out.pendingAckText).toBe("string");
    expect((out.pendingAckText || "").length).toBeGreaterThan(0);
  });

  it("pending + ack disabled => does not send ack", () => {
    const out = decideDeliveryPolicy({
      status: "pending",
      response: "irrelevant",
      lang: "es",
      pendingAckEnabled: false,
    });

    expect(out.shouldSendFinalReply).toBe(false);
    expect(out.shouldSendPendingAck).toBe(false);
    expect(out.pendingAckText).toBeUndefined();
  });
});

// Path: /root/begasist/lib/pipeline/deliveryPolicy.ts

import { buildPendingNotice } from "@/lib/agents/outputFormatterAgent";
import type { MessageStatus } from "@/types/channel";

export type DeliveryPolicyInput = {
  status: MessageStatus;
  response?: string;
  lang?: string;
  pendingAckEnabled?: boolean;
};

export type DeliveryPolicyDecision = {
  shouldSendFinalReply: boolean;
  finalReplyText?: string;
  shouldSendPendingAck: boolean;
  pendingAckText?: string;
};

export function decideDeliveryPolicy(input: DeliveryPolicyInput): DeliveryPolicyDecision {
  const responseText = typeof input.response === "string" ? input.response.trim() : "";
  const pendingAckEnabled = input.pendingAckEnabled !== false;

  if (input.status === "sent") {
    return {
      shouldSendFinalReply: responseText.length > 0,
      finalReplyText: responseText || undefined,
      shouldSendPendingAck: false,
    };
  }

  if (input.status === "pending") {
    return {
      shouldSendFinalReply: false,
      shouldSendPendingAck: pendingAckEnabled,
      pendingAckText: pendingAckEnabled ? buildPendingNotice(input.lang || "es") : undefined,
    };
  }

  return {
    shouldSendFinalReply: false,
    shouldSendPendingAck: false,
  };
}

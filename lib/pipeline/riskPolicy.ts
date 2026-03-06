// Path: /root/begasist/lib/pipeline/riskPolicy.ts

import type { ChannelMode } from "@/types/channel";

export type RiskLevel = "LOW" | "HIGH";

export type DecideRiskLevelInput = {
  category?: string;
  needsSupervision: boolean;
  salesStage?: string;
  isSafeCategory?: boolean;
};

export type ApplyRiskPolicyInput = {
  combinedMode: ChannelMode;
  supervisorStatus: "sent" | "pending";
  riskLevel: RiskLevel;
};

export type ApplyRiskPolicyOutput = {
  finalStatus: "sent" | "pending";
  autoApproved: boolean;
  reason: string;
};

const LOW_RISK_CATEGORIES = new Set([
  "greeting",
  "thanks",
  "goodbye",
  "smalltalk",
]);

const HIGH_RISK_CATEGORIES = new Set([
  "reservation",
  "modify_reservation",
  "cancel_reservation",
  "payment_required",
  "billing",
  "pricing_info",
]);

export function decideRiskLevel(input: DecideRiskLevelInput): RiskLevel {
  if (input.needsSupervision) return "HIGH";

  const category = String(input.category ?? "").trim().toLowerCase();
  if (HIGH_RISK_CATEGORIES.has(category)) return "HIGH";
  if (LOW_RISK_CATEGORIES.has(category)) return "LOW";

  if (input.isSafeCategory) return "LOW";
  return "HIGH";
}

export function applyRiskPolicyToSupervisorDecision(
  input: ApplyRiskPolicyInput,
): ApplyRiskPolicyOutput {
  if (input.combinedMode !== "supervised") {
    return {
      finalStatus: input.supervisorStatus,
      autoApproved: false,
      reason: "mode_not_supervised",
    };
  }

  // Preserve an explicit supervisor "sent" decision; risk policy only promotes LOW pending.
  if (input.supervisorStatus === "sent") {
    return {
      finalStatus: "sent",
      autoApproved: false,
      reason: "supervisor_sent_preserved",
    };
  }

  if (input.supervisorStatus === "pending" && input.riskLevel === "LOW") {
    return {
      finalStatus: "sent",
      autoApproved: true,
      reason: "low_risk_autosend_supervised",
    };
  }

  return {
    finalStatus: "pending",
    autoApproved: false,
    reason: "high_risk_or_pending_kept",
  };
}

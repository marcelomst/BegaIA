// Path: /root/begasist/test/golden/riskPolicy.golden.spec.ts

import { describe, expect, it } from "vitest";
import {
  applyRiskPolicyToSupervisorDecision,
  decideRiskLevel,
} from "@/lib/pipeline/riskPolicy";

describe("golden • riskPolicy D1 preserve supervisor decisions", () => {
  it("supervised + pending + LOW => sent (autoApproved)", () => {
    const riskLevel = decideRiskLevel({
      category: "greeting",
      needsSupervision: false,
      salesStage: undefined,
      isSafeCategory: true,
    });
    const out = applyRiskPolicyToSupervisorDecision({
      combinedMode: "supervised",
      supervisorStatus: "pending",
      riskLevel,
    });

    expect(riskLevel).toBe("LOW");
    expect(out.finalStatus).toBe("sent");
    expect(out.autoApproved).toBe(true);
  });

  it("supervised + sent + HIGH => stays sent", () => {
    const riskLevel = decideRiskLevel({
      category: "reservation",
      needsSupervision: false,
      salesStage: "quote",
      isSafeCategory: false,
    });
    const out = applyRiskPolicyToSupervisorDecision({
      combinedMode: "supervised",
      supervisorStatus: "sent",
      riskLevel,
    });

    expect(riskLevel).toBe("HIGH");
    expect(out.finalStatus).toBe("sent");
    expect(out.autoApproved).toBe(false);
  });

  it("supervised + pending + HIGH => pending", () => {
    const riskLevel = decideRiskLevel({
      category: "reservation",
      needsSupervision: false,
      salesStage: "quote",
      isSafeCategory: false,
    });
    const out = applyRiskPolicyToSupervisorDecision({
      combinedMode: "supervised",
      supervisorStatus: "pending",
      riskLevel,
    });

    expect(riskLevel).toBe("HIGH");
    expect(out.finalStatus).toBe("pending");
    expect(out.autoApproved).toBe(false);
  });

  it("automatic mode does not override supervisor status", () => {
    const riskLevel = decideRiskLevel({
      category: "greeting",
      needsSupervision: false,
      salesStage: undefined,
      isSafeCategory: true,
    });
    const out = applyRiskPolicyToSupervisorDecision({
      combinedMode: "automatic",
      supervisorStatus: "sent",
      riskLevel,
    });

    expect(out.finalStatus).toBe("sent");
    expect(out.autoApproved).toBe(false);
  });
});

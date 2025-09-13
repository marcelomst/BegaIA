// /lib/audit/compare.ts
import { AUDIT_POLICY } from "./policy";
import type { Interpretation, Verdict, RequiredSlot } from "@/lib/types/audit";

function sameAction(a?: string, b?: string) {
  if (!a && !b) return true;
  return a === b;
}

export function verdict(pre: Interpretation, llm: Interpretation): Verdict {
  const policy = AUDIT_POLICY[llm.category] ?? AUDIT_POLICY.retrieval_based;

  // 1) Intent agreement
  const intentOK =
    pre.category === llm.category &&
    pre.confidence.intent >= policy.intentMinAgree &&
    llm.confidence.intent >= policy.intentMinAgree;

  if (!intentOK) {
    return {
      status: "disagree",
      reason: `Intent mismatch (pre=${pre.category}/${pre.confidence.intent.toFixed(2)}, llm=${llm.category}/${llm.confidence.intent.toFixed(2)})`,
      deltas: [],
    };
  }

  // 2) Action (si aplica para reservas)
  if (policy.actionMustMatch && !sameAction(pre.desiredAction, llm.desiredAction)) {
    return {
      status: "disagree",
      reason: `DesiredAction mismatch (pre=${pre.desiredAction}, llm=${llm.desiredAction})`,
      deltas: [],
    };
  }

  // 3) Slots weighted agreement
  const weights = policy.slots.weights as Record<RequiredSlot, number>;
  const minSlotConf = policy.slots.minSlotConfidence;
  let agreeWeight = 0, totalWeight = 0;
  (Object.keys(weights) as RequiredSlot[]).forEach((k) => {
    const w = weights[k] ?? 0;
    totalWeight += w;
    const l = (llm.slots[k] ?? "").trim().toLowerCase();
    const p = (pre.slots[k] ?? "").trim().toLowerCase();

    const llmConf = llm.confidence.slots[k] ?? 0;
    // aceptamos si LLM tiene valor y confianza >= umbral
    const accepted = !!l && llmConf >= minSlotConf;

    // si pre también tiene valor y difiere mucho, lo marcamos
    if (p && l && p !== l && w > 0.5) {
      // choque en slot crítico
      return;
    }
    if (accepted) agreeWeight += w;
  });

  const ratio = totalWeight ? (agreeWeight / totalWeight) : 1;
  if (ratio >= policy.slots.minWeightedAgreement) {
    return { status: "agree", winner: "llm", reason: `intent ok, slots agree ${Math.round(ratio*100)}%` };
  }

  return {
    status: "disagree",
    reason: `Slots weighted agreement too low (${Math.round(ratio*100)}%)`,
    deltas: [],
  };
}

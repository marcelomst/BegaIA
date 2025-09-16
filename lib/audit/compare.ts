// Path: /root/begasist/lib/audit/compare.ts
import { AUDIT_POLICY } from "./policy";
import type { Interpretation, Verdict, RequiredSlot } from "@/types/audit";

// Evita TS7053: indexación segura + fallback
type Policy = typeof AUDIT_POLICY[keyof typeof AUDIT_POLICY];
function pickPolicy(category: Interpretation["category"]): Policy {
  const map = AUDIT_POLICY as Record<string, Policy>;
  return map[category] ?? AUDIT_POLICY.retrieval_based;
}

function sameAction(a?: string, b?: string) {
  if (!a && !b) return true;
  return a === b;
}

export function verdict(pre: Interpretation, llm: Interpretation): Verdict {
  const policy = pickPolicy(llm.category);

  // --- (B) Tolerancia para mezcla con retrieval_based ---
  const isRetrievalMix =
    pre.category === "retrieval_based" || llm.category === "retrieval_based";

  if (isRetrievalMix) {
    const highBoth =
      (pre.confidence.intent ?? 0) >= 0.8 &&
      (llm.confidence.intent ?? 0) >= 0.8;

    const involvesCancel =
      pre.category === "cancel_reservation" ||
      llm.category === "cancel_reservation";

    // Si no involucra cancel y no hay doble confianza alta y distinta,
    // damos “agree” para que no caiga en pending por consultas mixtas.
    if (!involvesCancel && !highBoth) {
      return { status: "agree", winner: "llm", reason: "retrieval_mix_tolerated" };
    }
  }

  // --- 1) Intent agreement estricto (salvo la excepción de arriba) ---
  const intentOK =
    pre.category === llm.category &&
    pre.confidence.intent >= policy.intentMinAgree &&
    llm.confidence.intent >= policy.intentMinAgree;

  if (!intentOK) {
    return {
      status: "disagree",
      reason: `Intent mismatch (pre=${pre.category}/${pre.confidence.intent.toFixed(
        2
      )}, llm=${llm.category}/${llm.confidence.intent.toFixed(2)})`,
      deltas: [],
    };
  }

  // --- 2) Acción: sólo exigimos match si la policy lo pide o si hay cancel ---
  const mustMatchAction =
    policy.actionMustMatch ||
    pre.desiredAction === "cancel" ||
    llm.desiredAction === "cancel";

  if (mustMatchAction && !sameAction(pre.desiredAction, llm.desiredAction)) {
    return {
      status: "disagree",
      reason: `DesiredAction mismatch (pre=${pre.desiredAction}, llm=${llm.desiredAction})`,
      deltas: [],
    };
  }

  // --- 3) Slots weighted agreement ---
  const weights = policy.slots.weights as Record<RequiredSlot, number>;
  const minSlotConf = policy.slots.minSlotConfidence;
  let agreeWeight = 0;
  let totalWeight = 0;

  (Object.keys(weights) as RequiredSlot[]).forEach((k) => {
    const w = weights[k] ?? 0;
    totalWeight += w;

    const l = (llm.slots[k] ?? "").trim().toLowerCase();
    const p = (pre.slots[k] ?? "").trim().toLowerCase();
    const llmConf = llm.confidence.slots[k] ?? 0;

    // Aceptamos si LLM propone valor y su confianza de slot ≥ umbral
    const accepted = !!l && llmConf >= minSlotConf;

    // (Opcional) si querés auditar diferencias en slots críticos:
    // if (p && l && p !== l && w > 0.5) deltas.push(`slot_diff:${k}:${p}->${l}`);

    if (accepted) agreeWeight += w;
  });

  const ratio = totalWeight ? agreeWeight / totalWeight : 1;
  if (ratio >= policy.slots.minWeightedAgreement) {
    return {
      status: "agree",
      winner: "llm",
      reason: `intent ok, slots agree ${Math.round(ratio * 100)}%`,
    };
  }

  return {
    status: "disagree",
    reason: `Slots weighted agreement too low (${Math.round(ratio * 100)}%)`,
    deltas: [],
  };
}

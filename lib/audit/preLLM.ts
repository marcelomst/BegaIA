// /lib/audit/preLLM.ts
import type { Interpretation, SlotMap } from "@/types/audit";
import { normalizeNameCase, heuristicClassify } from "@/lib/agents/helpers";
import { intentConfidenceByRules, slotsConfidenceByRules } from "./confidence";

export function preLLMInterpret(text: string, persistedSlots: SlotMap): Interpretation {
  const h = heuristicClassify(text);
  const slots: SlotMap = {};

  // Name sólo si parece nombre
  if (/* looksLikeName(text) */ false) {
    slots.guestName = normalizeNameCase(text);
  }

  // no completes fechas ni huéspedes aquí: sólo señales muy obvias si querés
  // ...

  const intentConf = intentConfidenceByRules(text, h.category);
  const slotConfs = slotsConfidenceByRules(slots);
  return {
    source: "pre",
    category: h.category,
    desiredAction: h.desiredAction,
    slots,
    confidence: { intent: intentConf, slots: slotConfs },
    notes: ["preLLM via heuristics"],
  };
}

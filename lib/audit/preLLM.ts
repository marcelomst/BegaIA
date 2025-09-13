// /lib/audit/preLLM.ts
import type { Interpretation, SlotMap } from "@/lib/types/audit";
import { heuristicClassify } from "@/lib/agents/graph_helpers"; // o muévelo a helpers
import { normalizeNameCase } from "@/lib/agents/graph";
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

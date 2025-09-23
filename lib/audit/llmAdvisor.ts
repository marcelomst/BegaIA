// Path: /root/begasist/lib/audit/llmAdvisor.ts
import type { Interpretation, SlotMap } from "@/types/audit";
import { classifyQuery } from "@/lib/classifier";
import { fillSlotsWithLLM } from "@/lib/agents/reservations";
import { intentConfidenceByRules, slotsConfidenceByRules } from "./confidence";

export async function llmInterpret(
  text: string,
  hotelId: string,
  locale: "es" | "en" | "pt",
  mergedSlots: SlotMap,
  hotelTz?: string
): Promise<Interpretation> {
  const cls = await classifyQuery(text, hotelId); // ⬅️ ya tiene desiredAction?
  const desiredAction = cls.desiredAction;        // ⬅️ sin cast

  const augmented =
    text + (Object.keys(mergedSlots).length ? `\n\nDatos previos conocidos: ${JSON.stringify(mergedSlots)}` : "");
  const filled = await fillSlotsWithLLM(augmented, locale, { hotelTz });

  const slots: SlotMap = {};
  if (filled.need === "none") {
    slots.guestName = filled.slots.guestName;
    slots.roomType = filled.slots.roomType;
    slots.checkIn = filled.slots.checkIn;
    slots.checkOut = filled.slots.checkOut;
    slots.numGuests = String(filled.slots.numGuests);
  } else if (filled.partial) {
    if (filled.partial.guestName) slots.guestName = filled.partial.guestName;
    if (filled.partial.roomType) slots.roomType = filled.partial.roomType;
    if (filled.partial.checkIn) slots.checkIn = filled.partial.checkIn;
    if (filled.partial.checkOut) slots.checkOut = filled.partial.checkOut;
    if (typeof filled.partial.numGuests === "number") slots.numGuests = String(filled.partial.numGuests);
  }

  const category = (cls.category as Interpretation["category"]) ?? "retrieval_based";
  const intentConf = intentConfidenceByRules(text, category);
  const slotConfs = slotsConfidenceByRules(slots);

  return {
    source: "llm",
    category,
    desiredAction,
    slots,
    confidence: { intent: intentConf, slots: slotConfs },
    notes: ["llm via classifyQuery + fillSlotsWithLLM"],
  };
}

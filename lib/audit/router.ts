// /lib/audit/router.ts
import type { SlotMap, SupervisionRecord } from "@/types/audit";
import { preLLMInterpret } from "./preLLM";
import { llmInterpret } from "./llmAdvisor";
import { verdict as compare } from "./compare";
import { upsertConvState } from "@/lib/db/convState";

export async function auditedInterpret(
  payload: {
    text: string;
    hotelId: string;
    conversationId: string;
    mergedSlots: SlotMap;
    locale: "es"|"en"|"pt";
    hotelTz?: string;
  }
) {
  const pre = preLLMInterpret(payload.text, payload.mergedSlots);
  const llm = await llmInterpret(payload.text, payload.hotelId, payload.locale, payload.mergedSlots, payload.hotelTz);
  const v = compare(pre, llm);

  if (v.status === "disagree") {
    const record: SupervisionRecord = {
      at: new Date().toISOString(),
      messageText: payload.text,
      pre, llm, verdict: v,
      hotelId: payload.hotelId,
      conversationId: payload.conversationId,
    };

    // 1) Persistimos bandera de supervisión (colección conv_state o logs aparte)
    await upsertConvState(payload.hotelId, payload.conversationId, {
      supervised: true,
      lastSupervision: record,
      updatedBy: "audit",
    });

    // 2) devolvemos un resultado “desviado”
    return { supervised: true as const, pre, llm, verdict: v };
  }

  // Si acuerdan → seguimos con la interpretación LLM (preferimos su contenido)
  return { supervised: false as const, pre, llm, verdict: v };
}

// Path: /root/begasist/lib/agents/auditAgent.ts
// Fase 4: Agente de Auditoría (posLLM) extraído como módulo independiente.
// Objetivo: mantener la lógica de posLLM existente (asesoría) sin cambiar contratos públicos.

import type { Interpretation, SlotMap } from "@/types/audit";
import { preLLMInterpret } from "@/lib/audit/preLLM";
import { verdict as auditVerdict } from "@/lib/audit/compare";
import { intentConfidenceByRules, slotsConfidenceByRules } from "@/lib/audit/confidence";

export type AuditInput = {
    lang: "es" | "en" | "pt";
    userText: string;
    nextCategory: string | null | undefined;
    nextSlots: any;
    needsSupervisionPrev: boolean | undefined;
    currSlots: SlotMap;
    graphResult?: any;
};

export type AuditOutput = {
    verdictInfo: any;
    llmInterp: Interpretation;
    needsSupervision: boolean;
};

// Constantes locales replicadas para evitar dependencia circular con messageHandler.ts
const SUPERVISE_LOW_CONF_INTENT = 0.35;
const SENSITIVE_CATEGORIES = new Set<string>([
    "cancel_reservation",
    "modify_reservation",
    "payment_required",
    "collect_sensitive_data",
]);

export async function runAuditAdvisory(input: AuditInput): Promise<AuditOutput> {
    const { lang, userText, nextCategory, nextSlots, needsSupervisionPrev, currSlots } = input;
    // Construcción de interpretación LLM a partir del resultado del planner/body
    const llmSlotsForAudit: SlotMap = {
        guestName: nextSlots?.guestName,
        roomType: nextSlots?.roomType,
        checkIn: nextSlots?.checkIn,
        checkOut: nextSlots?.checkOut,
        numGuests: nextSlots?.numGuests,
    };
    const llmIntentConf = intentConfidenceByRules(String(userText || ""), (nextCategory as any) || "retrieval_based");
    const llmSlotConfs = slotsConfidenceByRules(llmSlotsForAudit);
    const llmInterp: Interpretation = {
        source: "llm",
        category: (nextCategory as any) ?? "retrieval_based",
        desiredAction: undefined,
        slots: llmSlotsForAudit,
        confidence: { intent: llmIntentConf, slots: llmSlotConfs },
        notes: ["llm via agentGraph/structured result"],
    };

    let verdictInfo: any = null;
    let needsSupervision = !!needsSupervisionPrev;
    try {
        const preInterp = preLLMInterpret(String(userText || ""), {
            guestName: currSlots.guestName,
            roomType: currSlots.roomType,
            checkIn: currSlots.checkIn,
            checkOut: currSlots.checkOut,
            numGuests: currSlots.numGuests,
        });
        verdictInfo = auditVerdict(preInterp, llmInterp);
        const riskyCategory = SENSITIVE_CATEGORIES.has(String(llmInterp.category || ""));
        const lowIntentConf = typeof llmInterp.confidence?.intent === "number" && llmInterp.confidence.intent < SUPERVISE_LOW_CONF_INTENT;
        needsSupervision = needsSupervision || (riskyCategory && verdictInfo?.status === "disagree") || lowIntentConf;
    } catch (e) {
        console.warn("[auditAgent] verdict:error", (e as any)?.message || e);
    }

    return { verdictInfo, llmInterp, needsSupervision };
}

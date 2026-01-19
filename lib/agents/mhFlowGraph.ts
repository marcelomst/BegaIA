// Path: /root/begasist/lib/agents/mhFlowGraph.ts
// Fase 3: Grafo funcional (pipeline explícito) del flujo de conversación.
// Coordinador objetivo: este archivo define un estado único que avanza por nodos
// alineados con los agentes reales en /lib/agents/.
// Diagrama:
//   normalize → plan → audit → supervise → state → format → end
// Cada nodo escribe su "cajón" dentro de ConversationFlowState.

import type { ChannelMessage } from "@/types/channel";
import type { RichPayload } from "@/types/richPayload";
import { runInputNormalizer, type NormalizedContext } from "./inputNormalizerAgent";
import { runOrchestratorProxy, type OrchestratorOutput } from "./orchestratorAgent";
import { decideSupervisorStatus } from "./supervisorAgent";
import { updateConversationState } from "./stateUpdaterAgent";
import { buildPendingNotice } from "./outputFormatterAgent";
import { runAuditAdvisory } from "./auditAgent";

export type ConversationFlowState = {
    rawInput: {
        msg: ChannelMessage;
        options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMessage["channel"] | any; skipPersistIncoming?: boolean };
    };
    normalized?: NormalizedContext; // output de inputNormalizer
    orchestrator?: OrchestratorOutput; // salida del planner/orquestador (equiv a bodyLLM result)
    audit?: {
        verdictInfo?: any;
        llmInterp?: any;
    };
    supervision?: {
        combinedMode: "automatic" | "supervised";
        status: "sent" | "pending";
        needsSupervision: boolean;
        autosendReason?: string;
        pendingNotice?: string;
    };
    convState?: {
        lastCategory?: string | null;
        reservationSlots?: any;
        salesStage?: string;
    };
    output?: {
        messageText: string;
        richPayload?: RichPayload | null;
    };
    meta: {
        featureFlags: { USE_ORCHESTRATOR_AGENT: boolean; USE_MH_FLOW_GRAPH: boolean; USE_PRE_POS_PIPELINE?: boolean };
        timings: Record<string, number>;
        __orchestratorActive?: boolean;
    };
};

function nowMs() { return Date.now(); }

export async function runMhFlowGraph(initial: ConversationFlowState): Promise<ConversationFlowState> {
    const t0 = nowMs();
    const state: ConversationFlowState = { ...initial, meta: { ...initial.meta, timings: initial.meta.timings || {} } };

    // normalize
    const tN = nowMs();
    if (!state.normalized) {
        // Fase mínima: si el caller no provee normalized, construimos uno ligero.
        try {
            state.normalized = await runInputNormalizer({ msg: state.rawInput.msg });
        } catch (e) {
            throw new Error("NORMALIZE_FAILED:" + (e as any)?.message);
        }
    }
    state.meta.timings.normalize = nowMs() - tN;

    // plan (orchestrator) → usa proxy para conservar lógica de caminos migrados
    const tP = nowMs();
    const pre = state.normalized as any; // reutilizamos shape existente sin duplicar campos
    const bodyPhase = async () => {
        // Para Fase 3 seguimos utilizando bodyLLM embebido dentro de messageHandler indirectamente.
        // Aquí podríamos invocar directamente una función importada si estuviera separada.
        // Marcamos placeholder: el caller (messageHandler) inyectará bodyLLM via orchestratorProxy.
        throw new Error("BODY_PHASE_NOT_INJECTED");
    };
    // En esta fase, messageHandler nos llamará sólo para integrar después de obtener body.
    // Por eso permitimos que se pase orchestrator ya calculado en initial.orchestrator.
    if (!state.orchestrator) {
        // Si no hay orquestator ya definido, levantamos error para que el caller sepa inyectarlo.
        throw new Error("ORCHESTRATOR_MISSING_FASE3_CALLER_MUST_PROVIDE");
    }
    state.meta.timings.plan = nowMs() - tP;

    // audit (posLLM) – opcional, activado sólo si la pipeline pre/pos está ON
    const tA = nowMs();
    if (state.meta.featureFlags?.USE_PRE_POS_PIPELINE) {
        try {
            const pre = state.normalized as any;
            const aud = await runAuditAdvisory({
                lang: pre.lang,
                userText: String(pre?.msg?.content || ""),
                nextCategory: state.orchestrator?.nextCategory,
                nextSlots: state.orchestrator?.nextSlots,
                needsSupervisionPrev: state.orchestrator?.needsSupervision,
                currSlots: pre.currSlots,
                graphResult: state.orchestrator?.graphResult,
            });
            state.audit = { verdictInfo: aud.verdictInfo, llmInterp: aud.llmInterp };
            // Ajuste suave de supervisión si la auditoría lo indica
            if (state.orchestrator) {
                state.orchestrator.needsSupervision = aud.needsSupervision;
            }
        } catch (e) {
            // Auditoría es asesoría: si falla, continuamos sin bloquear el flujo.
        }
    }
    state.meta.timings.audit = nowMs() - tA;

    // supervise
    const tS = nowMs();
    const category = state.orchestrator.nextCategory || state.normalized?.prevCategory || null;
    const salesStage = (state.orchestrator.graphResult as any)?.salesStage;
    // combinedMode: por ahora derivado de guest.mode (si existe) + canal (simplificación)
    const guestMode = (state.normalized?.guest as any)?.mode === "supervised" ? "supervised" : "automatic";
    const combinedMode = guestMode;
    const needsSupervisionRaw = !!state.orchestrator.needsSupervision;
    const isSafeCategory = false; // se podría reutilizar isSafeAutosendCategory si se exporta desde handler
    const d = decideSupervisorStatus({ combinedMode, category: category || undefined, salesStage, needsSupervision: needsSupervisionRaw, isSafeCategory });
    state.supervision = {
        combinedMode,
        status: d.status,
        needsSupervision: d.status === "pending",
        autosendReason: d.autosendReason,
        pendingNotice: d.status === "pending" ? buildPendingNotice(category || "retrieval_based", state.normalized?.lang || "es") : undefined,
    };
    state.meta.timings.supervise = nowMs() - tS;

    // state updater (convState mínimo)
    const tCS = nowMs();
    const nextCat = state.orchestrator.nextCategory || state.normalized?.prevCategory || null;
    const nextSlots = state.orchestrator.nextSlots || state.normalized?.currSlots;
    const needsFollowupPersist = nextCat === "send_whatsapp_copy" || nextCat === "send_email_copy";
    if (needsFollowupPersist) {
        try {
            await updateConversationState(state.rawInput.msg.hotelId, state.normalized?.conversationId, {
                reservationSlots: nextSlots,
                lastCategory: nextCat,
                updatedBy: "ai",
            } as any);
            state.convState = { lastCategory: nextCat, reservationSlots: nextSlots };
        } catch (e) {
            state.convState = { lastCategory: nextCat, reservationSlots: nextSlots };
        }
    } else {
        // Para paridad con Fase 2 no persistimos otras categorías aquí.
        state.convState = { lastCategory: nextCat, reservationSlots: nextSlots };
    }
    state.meta.timings.state = nowMs() - tCS;

    // format
    const tF = nowMs();
    state.output = {
        messageText: state.orchestrator.finalText,
        richPayload: null,
    };
    state.meta.timings.format = nowMs() - tF;
    state.meta.timings.total = nowMs() - t0;
    return state;
}

// Nota: en Fase 4 reemplazaremos el placeholder del bodyPhase y exportaremos helpers
// adicionales para isSafeAutosendCategory desde un módulo común.

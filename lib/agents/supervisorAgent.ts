// Path: /root/begasist/lib/agents/supervisorAgent.ts
import type { ChannelMode } from "@/types/channel";

export type AutosendReason = "snapshot_verify" | "close_stage" | "safe_category" | "supervised_pending" | "automatic_default";
export type AutosendDecision = {
    autoSend: boolean;
    status: "sent" | "pending";
    autosendReason: AutosendReason;
};

export type SupervisorDecisionInput = {
    combinedMode: ChannelMode;
    category?: string;
    salesStage?: string;
    needsSupervision: boolean;
    isSafeCategory: boolean;
};

export function decideSupervisorStatus(input: SupervisorDecisionInput): AutosendDecision {
    const { combinedMode, category, salesStage, needsSupervision, isSafeCategory } = input;
    const isSnapshotReply = Boolean(
        category && (
            category === "reservation_snapshot" ||
            category === "reservation_verify" ||
            (category === "reservation" && salesStage === "close")
        )
    );

    if (isSnapshotReply) {
        const autosendReason: AutosendReason = (category === "reservation" && salesStage === "close")
            ? "close_stage"
            : "snapshot_verify";
        return { autoSend: true, status: "sent", autosendReason };
    }
    if (!needsSupervision && combinedMode === "automatic" && isSafeCategory) {
        return { autoSend: true, status: "sent", autosendReason: "safe_category" };
    }
    if (!needsSupervision && combinedMode === "automatic") {
        return { autoSend: true, status: "sent", autosendReason: "automatic_default" };
    }
    return { autoSend: false, status: "pending", autosendReason: "supervised_pending" };
}

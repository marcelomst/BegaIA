// Path: /root/begasist/lib/telemetry/metrics.ts

export type AutosendReason =
    | "snapshot_verify"
    | "close_stage"
    | "safe_category"
    | "supervised_pending"
    | "automatic_default";

type CountersByReason = Record<AutosendReason, number>;

type CountersByCategory = Record<string, number>;

type MetricsShape = {
    autosend_total: number;
    autosend_by_reason: CountersByReason;
    autosend_by_category: CountersByCategory;
    supervised_ratio_window: { sent: number; pending: number };
};

const emptyByReason = (): CountersByReason => ({
    snapshot_verify: 0,
    close_stage: 0,
    safe_category: 0,
    supervised_pending: 0,
    automatic_default: 0,
});

const metrics: MetricsShape = {
    autosend_total: 0,
    autosend_by_reason: emptyByReason(),
    autosend_by_category: Object.create(null),
    supervised_ratio_window: { sent: 0, pending: 0 },
};

export function incAutosend(reason: AutosendReason, category: string, isSent: boolean): void {
    try {
        metrics.autosend_total += 1;
        metrics.autosend_by_reason[reason] = (metrics.autosend_by_reason[reason] || 0) + 1;
        const key = String(category || "unknown").toLowerCase();
        metrics.autosend_by_category[key] = (metrics.autosend_by_category[key] || 0) + 1;
        if (isSent) metrics.supervised_ratio_window.sent += 1; else metrics.supervised_ratio_window.pending += 1;
    } catch { /* best-effort, no throw */ }
}

export function snapshot() {
    // Return a deep-ish clone safe for serialization
    return {
        at: new Date().toISOString(),
        autosend_total: metrics.autosend_total,
        autosend_by_reason: { ...metrics.autosend_by_reason },
        autosend_by_category: { ...metrics.autosend_by_category },
        supervised_ratio_window: { ...metrics.supervised_ratio_window },
    } as const;
}

export function reset(): void {
    metrics.autosend_total = 0;
    metrics.autosend_by_reason = emptyByReason();
    metrics.autosend_by_category = Object.create(null);
    metrics.supervised_ratio_window = { sent: 0, pending: 0 };
}

// Path: scripts/semantic-normalization-spike/sin-v2/adapter.ts

import type {
  AuditCandidate,
  AuditInput,
  AuditReport,
  AuditResult,
  ContextProjection,
  EffectKind,
  EvidenceSpan,
  ReferentKind,
  SemanticRelation,
  SemanticUnit,
} from "../rda-offline/evaluator";
import type { CommunicativeAct, SinV2Output, SinV2Unit } from "./contract";
import { validateSinV2, type ValidationIssue } from "./validator";

export const ADAPTER_TABLES_VERSION = "sin-v2-adapter-tables-v1";

/**
 * Tablas cerradas. Coincidencia exacta tras normalizar. Sin entrada => no hay
 * equivalencia justificada y se conserva la incertidumbre (nunca se rellena).
 */

// Acto -> material. Solo discurso e información pura son no materiales; ante duda, material.
export const MATERIAL_BY_ACT: Record<CommunicativeAct, boolean> = {
  instruct: true,
  ask: true,
  affirm: true,
  reject: true,
  correct: true,
  retract: true,
  qualify: true,
  inform: false,
  discourse: false,
};

// Un inform/discourse con dependencia o referente ambiguo tiene significado contextual pendiente: se trata como material.
export function unitMaterial(unit: SinV2Unit): boolean {
  if (MATERIAL_BY_ACT[unit.act]) return true;
  return unit.dependencies.length > 0 || unit.referent.resolution === "ambiguous";
}

export const REFERENT_LEXICON: Record<string, ReferentKind> = {
  "la reserva": "reservation",
  "mi reserva": "reservation",
  "reserva": "reservation",
  "los cambios": "changes",
  "cambios": "changes",
  "la propuesta": "proposal",
  "propuesta": "proposal",
  "la fecha de salida": "other",
  "la fecha de llegada": "other",
  "la llegada": "other",
  "la salida": "other",
};

export type VerbClass = "cancel" | "discard" | "modify" | "confirm";

export const VERB_FORMS: Record<string, VerbClass> = {
  cancelar: "cancel", cancela: "cancel", cancele: "cancel", canceles: "cancel", cancelo: "cancel", cancelen: "cancel",
  descartar: "discard", descarta: "discard", descarte: "discard", descartes: "discard",
  eliminar: "discard", elimina: "discard", elimine: "discard", elimines: "discard",
  modificar: "modify", modifica: "modify", modifique: "modify", modifiques: "modify",
  confirmar: "confirm", confirma: "confirm", confirme: "confirm", confirmes: "confirm", confirmo: "confirm",
};

export const PROHIBITION_TABLE: Record<string, EffectKind> = {
  "cancel|reservation": "cancel_reservation",
  "cancel|changes": "discard_changes",
  "discard|changes": "discard_changes",
  "discard|proposal": "discard_changes",
  "modify|reservation": "modify_reservation",
  "confirm|changes": "confirm_changes",
  "confirm|proposal": "confirm_changes",
};

export const SCOPE_TABLE: Record<string, string> = {
  "la fecha de salida": "departure_date",
  "fecha de salida": "departure_date",
  "la fecha de llegada": "arrival_date",
  "fecha de llegada": "arrival_date",
};

const RDA_RELATION_TYPES = new Set(["excepts", "contradicts"]);

export type AdaptationEntryKind =
  | "relation-unsupported"
  | "dependency-unsupported"
  | "referent-kind-unmapped"
  | "prohibition-unmapped"
  | "scope-unmapped"
  | "predicate-substituted"
  | "rejection-not-projected"
  | "referent-ambiguous"
  | "interpretation-partial";

export interface AdaptationEntry {
  unitId: string;
  kind: AdaptationEntryKind;
  disposition: "not_projected" | "degraded";
  material: boolean;
  detail: string;
}

export interface AdaptationReport {
  tablesVersion: string;
  validation: { valid: boolean; issues: ValidationIssue[] };
  entries: AdaptationEntry[];
  limitations: string[];
}

export interface AdaptationInput {
  sin: unknown;
  candidate: AuditCandidate;
  context: ContextProjection | null;
}

export interface AdaptationResult {
  rdaInput: AuditInput;
  adaptationReport: AdaptationReport;
}

export interface FinalAggregation {
  rdaReport: AuditReport;
  adaptationReport: AdaptationReport;
  finalResult: AuditResult;
  reasons: string[];
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?¿¡]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function projectedUnit(unit: SinV2Unit, unitsById: Map<string, SinV2Unit>, entries: AdaptationEntry[]): SemanticUnit {
  const material = unitMaterial(unit);
  const note = (
    kind: AdaptationEntryKind,
    disposition: AdaptationEntry["disposition"],
    detail: string,
    materialOverride?: boolean,
  ) => entries.push({ unitId: unit.id, kind, disposition, material: materialOverride ?? material, detail });

  const uncertainty = unit.uncertainty.map((item) => `${item.field}: ${item.reason}`);
  const evidence: EvidenceSpan[] = [];
  let predicate = unit.predicate;
  if (predicate === null) {
    predicate = unit.evidence.find((item) => item.field === "act")?.span ?? "";
    note("predicate-substituted", "degraded", "Sin predicado verbal: se proyecta el span del acto como predicado.", false);
  }
  evidence.push({ field: "predicate", text: predicate });
  for (const item of unit.evidence) {
    if (item.field === "polarity" || item.field === "referent" || item.field === "relation") {
      evidence.push({ field: item.field, text: item.span });
    }
  }

  const referentKind: ReferentKind = unit.referent.surface === null
    ? "unknown"
    : REFERENT_LEXICON[normalizeText(unit.referent.surface)] ?? "unknown";
  if (unit.referent.surface !== null && referentKind === "unknown") {
    note("referent-kind-unmapped", "degraded", `Sin equivalencia de tipo para el referente «${unit.referent.surface}».`);
  }

  const prohibitedEffectKinds: EffectKind[] = [];
  if (unit.polarity === "negative") {
    const verb = VERB_FORMS[normalizeText(predicate).split(" ")[0] ?? ""];
    const effectKind = verb ? PROHIBITION_TABLE[`${verb}|${referentKind}`] : undefined;
    if (effectKind) {
      prohibitedEffectKinds.push(effectKind);
    } else {
      note("prohibition-unmapped", "degraded", "Negación sin equivalencia verbo × referente: alcance no determinable.", true);
    }
  }

  if (unit.act === "reject" || unit.act === "retract") {
    // RDA no modela rechazos ni retractaciones: solo una negación con prohibición mapeada es auditable.
    if (prohibitedEffectKinds.length === 0) {
      note(
        "rejection-not-projected",
        "not_projected",
        `El acto ${unit.act} (referente: ${unit.referent.surface ?? "ausente"}) no tiene proyección auditable en RDA; no se inventan prohibiciones.`,
        true,
      );
    }
  }
  if (unit.referent.resolution === "ambiguous") {
    note("referent-ambiguous", "degraded", `Referente ambiguo «${unit.referent.surface}»: no se resuelve ni se infiere su tipo.`);
  }
  if (unit.status !== "interpreted") {
    note(
      "interpretation-partial",
      "degraded",
      `Unidad ${unit.status}: RDA la tratará como no verificable y no podrá demostrar incompatibilidades sobre ella.`,
      true,
    );
  }

  const relations: SemanticRelation[] = [];
  for (const relation of unit.relations) {
    const target = unitsById.get(relation.targetUnitId);
    const relationMaterial = material || (target ? unitMaterial(target) : true);
    if (!RDA_RELATION_TYPES.has(relation.type)) {
      note("relation-unsupported", "not_projected", `RDA no audita la relación ${relation.type} hacia ${relation.targetUnitId}.`, relationMaterial);
      continue;
    }
    let scopeKey: string | undefined;
    if (relation.type === "excepts") {
      scopeKey = relation.scopeSurface === undefined ? undefined : SCOPE_TABLE[normalizeText(relation.scopeSurface)];
      if (scopeKey === undefined) {
        note("scope-unmapped", "degraded", "Excepción sin scopeKey equivalente en la tabla cerrada.", relationMaterial);
      }
    }
    relations.push({
      kind: relation.type as "excepts" | "contradicts",
      targetUnitId: relation.targetUnitId,
      ...(scopeKey === undefined ? {} : { scopeKey }),
      evidence: relation.evidence,
    });
  }

  // La dependencia no cambia la validez proyectada: degradarla a partial haría que RDA
  // oculte contradicciones demostrables. La degradación la aplica aggregateFinalResult.
  for (const dependency of unit.dependencies) {
    note(
      "dependency-unsupported",
      "not_projected",
      `Dependencia ${dependency.kind} no proyectable: RDA no recibe antecedentes ni estado previo.`,
    );
    uncertainty.push(`dependency: ${dependency.kind} no resuelta (incertidumbre contextual, no error lingüístico)`);
  }

  return {
    id: unit.id,
    validity: unit.status === "interpreted" ? "valid" : unit.status,
    material,
    predicate,
    polarity: unit.polarity === "positive" ? "affirmative" : unit.polarity,
    referent: { kind: referentKind, certainty: unit.referent.resolution, surface: unit.referent.surface },
    prohibitedEffectKinds,
    relations,
    evidence,
    uncertainty,
  };
}

const ADAPTER_LIMITATIONS = [
  "El adaptador no resuelve antecedentes, no infiere efectos y no genera candidatas.",
  "Las tablas son cerradas: sin entrada se conserva la incertidumbre.",
  "La degradación conservadora vale solo para las transformaciones catalogadas en este módulo.",
  "Un adaptationReport sin entradas no demuestra que SIN haya interpretado correctamente ni que no haya omisiones.",
  "Ningún resultado autoriza operaciones.",
];

export function adaptSinV2ToRda(input: AdaptationInput): AdaptationResult {
  const validation = validateSinV2(input.sin);
  const entries: AdaptationEntry[] = [];
  const base = { tablesVersion: ADAPTER_TABLES_VERSION, limitations: ADAPTER_LIMITATIONS };

  if (!validation.valid) {
    const raw = input.sin as { message?: unknown } | null;
    return {
      rdaInput: {
        message: typeof raw?.message === "string" ? raw.message : "",
        sin: { status: "invalid", units: [] },
        candidate: input.candidate,
        context: input.context,
      },
      adaptationReport: { ...base, validation: { valid: false, issues: validation.issues }, entries },
    };
  }

  const output: SinV2Output = validation.output;
  const unitsById = new Map(output.units.map((unit) => [unit.id, unit]));
  const units = output.units.map((unit) => projectedUnit(unit, unitsById, entries));
  if (output.status !== "complete") {
    entries.push({
      unitId: "$global",
      kind: "interpretation-partial",
      disposition: "degraded",
      material: true,
      detail: `Interpretación global ${output.status}: RDA no puede dar un dictamen definitivo.`,
    });
  }
  const status = output.status === "complete" ? "valid" : output.status === "partial" ? "partial" : "absent";

  return {
    rdaInput: {
      message: output.message,
      sin: { status, units },
      candidate: input.candidate,
      context: input.context,
    },
    adaptationReport: { ...base, validation: { valid: true, issues: [] }, entries },
  };
}

/**
 * Agregación experimental. Solo puede mantener o empeorar el dictamen de RDA
 * (nunca mejorarlo) y nunca lo convierte en una autorización.
 */
export function aggregateFinalResult(rdaReport: AuditReport, adaptationReport: AdaptationReport): FinalAggregation {
  const reasons: string[] = [];
  let floor: AuditResult = "consistent";
  if (!adaptationReport.validation.valid) {
    floor = "indeterminate";
    reasons.push("La salida SIN V2 no superó la validación estructural.");
  }
  for (const entry of adaptationReport.entries) {
    if (entry.material) {
      floor = "indeterminate";
      reasons.push(`${entry.unitId}: ${entry.kind} material (${entry.disposition}).`);
    }
  }
  const finalResult: AuditResult = rdaReport.result === "consistent" ? floor : rdaReport.result;
  return { rdaReport, adaptationReport, finalResult, reasons };
}

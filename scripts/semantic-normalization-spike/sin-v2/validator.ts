// Path: scripts/semantic-normalization-spike/sin-v2/validator.ts

import { FORBIDDEN_KEYS, sinV2OutputSchema, type SinV2Output, type SinV2Unit } from "./contract";

export interface ValidationIssue {
  code: string;
  unitId?: string;
  detail: string;
}

export type ValidationResult =
  | { valid: true; output: SinV2Output; issues: [] }
  | { valid: false; output: null; issues: ValidationIssue[] };

const PREDICATELESS_ACTS = new Set(["reject", "affirm", "discourse", "correct", "retract"]);
const forbiddenKeySet = new Set<string>(FORBIDDEN_KEYS);

function findForbiddenKeys(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${path}[${index}]`, issues));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeySet.has(key)) {
      issues.push({
        code: "forbidden-field",
        detail: `SIN V2 no puede emitir el campo ${path}.${key} (decisión, efecto, target o autorización).`,
      });
    }
    findForbiddenKeys(child, `${path}.${key}`, issues);
  }
}

function hasEvidence(unit: SinV2Unit, field: SinV2Unit["evidence"][number]["field"], span?: string): boolean {
  return unit.evidence.some((item) => item.field === field && (span === undefined || item.span === span));
}

function hasRelationCycle(units: SinV2Unit[]): string | null {
  const edges = new Map(units.map((unit) => [unit.id, unit.relations.map((relation) => relation.targetUnitId)]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string): string | null => {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "visiting") return id;
    state.set(id, "visiting");
    for (const next of edges.get(id) ?? []) {
      if (!edges.has(next)) continue;
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    state.set(id, "done");
    return null;
  };
  for (const unit of units) {
    const cycle = visit(unit.id);
    if (cycle) return cycle;
  }
  return null;
}

function validateUnit(unit: SinV2Unit, message: string, issues: ValidationIssue[]): void {
  const add = (code: string, detail: string) => issues.push({ code, unitId: unit.id, detail });

  if (unit.predicate === null) {
    if (!PREDICATELESS_ACTS.has(unit.act)) add("predicate-required", `El acto ${unit.act} exige predicado literal.`);
    if (unit.polarity !== "neutral") add("predicateless-polarity", "Una unidad sin predicado verbal solo admite polaridad neutral.");
    if (!hasEvidence(unit, "act")) add("act-evidence-missing", "Una unidad sin predicado requiere evidencia literal del acto.");
  } else {
    if (!message.includes(unit.predicate)) add("predicate-not-literal", "El predicado no aparece literalmente en el mensaje.");
    if (!hasEvidence(unit, "predicate", unit.predicate)) add("predicate-evidence-missing", "Falta evidencia que coincida con el predicado.");
  }

  if (unit.polarity === "negative" && !hasEvidence(unit, "polarity")) {
    add("polarity-evidence-missing", "La polaridad negativa requiere evidencia literal declarada.");
  }

  const { surface, resolution } = unit.referent;
  if ((resolution === "absent") !== (surface === null)) {
    add("referent-shape", "El referente es absent si y solo si su superficie es null.");
  }
  if (surface !== null) {
    if (!message.includes(surface)) add("referent-not-literal", "La superficie del referente no aparece literalmente en el mensaje.");
    if (!hasEvidence(unit, "referent", surface)) add("referent-evidence-missing", "Falta evidencia que coincida con el referente.");
  }

  for (const item of unit.evidence) {
    if (!message.includes(item.span)) {
      add("evidence-not-literal", `El span de evidencia ${item.field} no aparece literalmente en el mensaje.`);
    }
  }

  for (const relation of unit.relations) {
    if (!message.includes(relation.evidence)) add("relation-evidence-not-literal", "La evidencia de la relación no es literal.");
    if (!hasEvidence(unit, "relation", relation.evidence)) add("relation-evidence-missing", "La relación no está respaldada en evidence[].");
    if (relation.scopeSurface !== undefined && !message.includes(relation.scopeSurface)) {
      add("relation-scope-not-literal", "El scopeSurface de la relación no aparece literalmente en el mensaje.");
    }
  }

  for (const dependency of unit.dependencies) {
    if (!message.includes(dependency.evidence)) add("dependency-evidence-not-literal", "La evidencia de la dependencia no es literal.");
  }

  if ((unit.status === "partial" || unit.status === "abstained") && unit.uncertainty.length === 0) {
    add("uncertainty-required", `Una unidad ${unit.status} debe declarar incertidumbre localizada.`);
  }
  if (resolution === "ambiguous" && !unit.uncertainty.some((item) => item.field === "referent")) {
    add("referent-uncertainty-required", "Un referente ambiguo debe declarar incertidumbre sobre el referente.");
  }
}

/**
 * Valida estructura y evidencia literal. Un span literal válido no demuestra
 * comprensión semántica, y el validador no detecta unidades omitidas.
 * No repara la salida: devuelve los problemas tal cual.
 */
export function validateSinV2(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  findForbiddenKeys(input, "$", issues);

  const parsed = sinV2OutputSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ code: "schema", detail: `${issue.path.join(".") || "$"}: ${issue.message}` });
    }
    return { valid: false, output: null, issues };
  }

  const output = parsed.data;
  const ids = new Set<string>();
  for (const unit of output.units) {
    if (ids.has(unit.id)) issues.push({ code: "duplicate-unit-id", unitId: unit.id, detail: "Identificador de unidad duplicado." });
    ids.add(unit.id);
  }
  for (const unit of output.units) {
    validateUnit(unit, output.message, issues);
    for (const relation of unit.relations) {
      if (relation.targetUnitId === unit.id) {
        issues.push({ code: "relation-self-reference", unitId: unit.id, detail: "Una relación no puede apuntar a su propia unidad." });
      } else if (!ids.has(relation.targetUnitId)) {
        issues.push({ code: "relation-target-missing", unitId: unit.id, detail: `La unidad ${relation.targetUnitId} no existe.` });
      }
    }
  }
  const cycle = hasRelationCycle(output.units);
  if (cycle) issues.push({ code: "relation-cycle", unitId: cycle, detail: "Las relaciones entre unidades forman un ciclo." });

  if (output.units.length === 0 && output.status !== "abstained") {
    issues.push({ code: "empty-units", detail: "Sin unidades solo es válido con estado global abstained." });
  }
  if (output.status === "complete" && output.units.some((unit) => unit.status !== "interpreted")) {
    issues.push({ code: "global-status-mismatch", detail: "Estado complete exige todas las unidades interpreted." });
  }
  if (output.status === "abstained" && output.units.some((unit) => unit.status === "interpreted")) {
    issues.push({ code: "global-status-mismatch", detail: "Estado abstained no admite unidades interpreted." });
  }

  return issues.length === 0
    ? { valid: true, output, issues: [] }
    : { valid: false, output: null, issues };
}

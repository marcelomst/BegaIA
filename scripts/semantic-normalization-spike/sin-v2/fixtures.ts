// Path: scripts/semantic-normalization-spike/sin-v2/fixtures.ts

import type { AuditCandidate, AuditResult, CandidateEffect, ContextProjection } from "../rda-offline/evaluator";
import type { SinV2Output, SinV2Unit } from "./contract";

/**
 * Fixtures redactadas manualmente como material de desarrollo.
 * No son benchmark ciego ni gold humano independiente.
 */

export interface FixtureVariant {
  id: string;
  note: string;
  candidate: AuditCandidate;
  context: ContextProjection | null;
  expected: { rda: AuditResult; final: AuditResult };
}

export interface SinV2Fixture {
  id: string;
  note: string;
  sin: SinV2Output;
  variants: FixtureVariant[];
}

type UnitOptions = Partial<Pick<SinV2Unit, "status" | "relations" | "dependencies" | "uncertainty">>;

export function makeUnit(
  id: string,
  act: SinV2Unit["act"],
  predicate: string | null,
  polarity: SinV2Unit["polarity"],
  surface: string | null,
  resolution: SinV2Unit["referent"]["resolution"],
  extra: { polaritySpan?: string; actSpan?: string } & UnitOptions = {},
): SinV2Unit {
  const relations = extra.relations ?? [];
  return {
    id,
    status: extra.status ?? "interpreted",
    act,
    predicate,
    polarity,
    referent: { surface, resolution },
    relations,
    dependencies: extra.dependencies ?? [],
    evidence: [
      ...(predicate === null && extra.actSpan ? [{ field: "act" as const, span: extra.actSpan }] : []),
      ...(predicate !== null ? [{ field: "predicate" as const, span: predicate }] : []),
      ...(extra.polaritySpan ? [{ field: "polarity" as const, span: extra.polaritySpan }] : []),
      ...(surface !== null ? [{ field: "referent" as const, span: surface }] : []),
      ...relations.map((relation) => ({ field: "relation" as const, span: relation.evidence })),
    ],
    uncertainty: extra.uncertainty ?? [],
  };
}

export function makeSin(message: string, units: SinV2Unit[], status: SinV2Output["status"] = "complete"): SinV2Output {
  return { schema: "sin-v2-experimental", message, status, units };
}

const MUTATING: CandidateEffect["kind"][] = ["cancel_reservation", "discard_changes", "modify_reservation", "confirm_changes"];

export function effect(
  id: string,
  kind: CandidateEffect["kind"],
  unitIds: string[],
  targetKind: CandidateEffect["targetKind"],
  extra: Partial<CandidateEffect> = {},
): CandidateEffect {
  return { id, kind, unitIds, targetKind, scopeKeys: [], ...extra };
}

export function makeCandidate(id: string, coveredUnitIds: string[], effects: CandidateEffect[]): AuditCandidate {
  return {
    id,
    scope: "complete",
    coveredUnitIds,
    mutates: effects.some((item) => MUTATING.includes(item.kind)),
    effects,
    requiredConstraintIds: [],
  };
}

export function makeContext(): ContextProjection {
  return {
    source: "fixture:declared-projection",
    version: "fixture-v1",
    freshness: "current",
    proposalLookup: "complete",
    proposals: [{ id: "P1", status: "pending" }],
    referenceResolutions: [],
    constraints: [],
  };
}

const ctx = makeContext;

export const sinV2Fixtures: SinV2Fixture[] = [
  {
    id: "F1-prohibition-with-undetermined-referent",
    note: "«eso» queda ambiguo con dependencia de antecedente; no se resuelve.",
    sin: makeSin("No canceles la reserva; descartá eso", [
      makeUnit("u1", "instruct", "canceles", "negative", "la reserva", "explicit", { polaritySpan: "No" }),
      makeUnit("u2", "instruct", "descartá", "positive", "eso", "ambiguous", {
        dependencies: [{ kind: "antecedent", evidence: "eso" }],
        uncertainty: [{ field: "referent", reason: "El antecedente de «eso» no está en el mensaje." }],
      }),
    ]),
    variants: [
      {
        id: "preserve-and-clarify",
        note: "Conserva la reserva y pide precisión sobre «eso».",
        candidate: makeCandidate("F1-a", ["u1", "u2"], [
          effect("e1", "preserve_reservation", ["u1"], "reservation", { targetRef: "R1" }),
          effect("e2", "clarify", ["u2"], "unknown"),
        ]),
        context: ctx(),
        expected: { rda: "consistent", final: "indeterminate" },
      },
      {
        id: "cancels-prohibited-reservation",
        note: "La candidata cancela la reserva prohibida.",
        candidate: makeCandidate("F1-b", ["u1", "u2"], [
          effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" }),
          effect("e2", "clarify", ["u2"], "unknown"),
        ]),
        context: ctx(),
        expected: { rda: "incompatible", final: "incompatible" },
      },
    ],
  },
  {
    id: "F2-explicit-instruction",
    note: "Instrucción afirmativa sin dependencias ni relaciones: no hay degradación.",
    sin: makeSin("Quiero cancelar los cambios", [
      makeUnit("u1", "instruct", "cancelar", "positive", "los cambios", "explicit"),
    ]),
    variants: [
      {
        id: "discard-changes",
        note: "Descarta los cambios pendientes.",
        candidate: makeCandidate("F2-a", ["u1"], [effect("e1", "discard_changes", ["u1"], "changes", { targetRef: "P1" })]),
        context: ctx(),
        expected: { rda: "consistent", final: "consistent" },
      },
      {
        id: "substitutes-reservation",
        note: "Sustituye cambios por reserva.",
        candidate: makeCandidate("F2-b", ["u1"], [effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" })]),
        context: ctx(),
        expected: { rda: "incompatible", final: "incompatible" },
      },
    ],
  },
  {
    id: "F3-retraction-with-prior-state",
    note: "La retractación apunta a un turno previo (dependencia, no relación intra-mensaje); «como estaba» exige estado previo.",
    sin: makeSin("Cambié de idea, dejá la reserva como estaba", [
      makeUnit("u1", "retract", "Cambié de idea", "neutral", null, "absent", {
        dependencies: [{ kind: "prior_turn", evidence: "Cambié de idea" }],
      }),
      makeUnit("u2", "instruct", "dejá", "positive", "la reserva", "explicit", {
        dependencies: [{ kind: "prior_state", evidence: "como estaba" }],
      }),
    ]),
    variants: [
      {
        id: "clarify-only",
        note: "La candidata solo pide precisión.",
        candidate: makeCandidate("F3-a", ["u1", "u2"], [effect("e1", "clarify", ["u1", "u2"], "unknown")]),
        context: ctx(),
        expected: { rda: "consistent", final: "indeterminate" },
      },
    ],
  },
  {
    id: "F4-affirmation-with-prior-state",
    note: "Afirmación autónoma sin verbo más instrucción con clítico; ambas con dependencia.",
    sin: makeSin("Sí, dejalo como estaba", [
      makeUnit("u1", "affirm", null, "neutral", null, "absent", {
        actSpan: "Sí",
        dependencies: [{ kind: "prior_turn", evidence: "Sí" }],
      }),
      makeUnit("u2", "instruct", "dejalo", "positive", "lo", "ambiguous", {
        dependencies: [{ kind: "antecedent", evidence: "lo" }, { kind: "prior_state", evidence: "como estaba" }],
        uncertainty: [{ field: "referent", reason: "El antecedente del clítico no está en el mensaje." }],
      }),
    ]),
    variants: [
      {
        id: "clarify-only",
        note: "La candidata solo pide precisión.",
        candidate: makeCandidate("F4-a", ["u1", "u2"], [effect("e1", "clarify", ["u1", "u2"], "unknown")]),
        context: ctx(),
        expected: { rda: "consistent", final: "indeterminate" },
      },
    ],
  },
  {
    id: "F5-exception-with-mapped-scope",
    note: "Excepción con scopeSurface presente en la tabla cerrada.",
    sin: makeSin("Confirmo los cambios, excepto la fecha de salida", [
      makeUnit("u1", "instruct", "Confirmo", "positive", "los cambios", "explicit"),
      makeUnit("u2", "qualify", "excepto", "neutral", "la fecha de salida", "explicit", {
        relations: [{
          type: "excepts",
          targetUnitId: "u1",
          scopeSurface: "la fecha de salida",
          evidence: "excepto la fecha de salida",
        }],
      }),
    ]),
    variants: [
      {
        id: "confirms-excepted-scope",
        note: "La candidata confirma también el alcance exceptuado.",
        candidate: makeCandidate("F5-a", ["u1", "u2"], [
          effect("e1", "confirm_changes", ["u1"], "proposal", { targetRef: "P1", scopeKeys: ["departure_date"] }),
        ]),
        context: ctx(),
        expected: { rda: "incompatible", final: "incompatible" },
      },
    ],
  },
  {
    id: "F5b-exception-with-unmapped-scope",
    note: "Misma excepción, pero scopeSurface fuera de la tabla: no hay scopeKey verificable.",
    sin: makeSin("Confirmo los cambios, excepto la fecha de salida", [
      makeUnit("u1", "instruct", "Confirmo", "positive", "los cambios", "explicit"),
      makeUnit("u2", "qualify", "excepto", "neutral", "la fecha de salida", "explicit", {
        relations: [{
          type: "excepts",
          targetUnitId: "u1",
          scopeSurface: "salida",
          evidence: "excepto la fecha de salida",
        }],
      }),
    ]),
    variants: [
      {
        id: "clarify-only",
        note: "La candidata pide precisión.",
        candidate: makeCandidate("F5b-a", ["u1", "u2"], [effect("e1", "clarify", ["u1", "u2"], "unknown")]),
        context: ctx(),
        expected: { rda: "indeterminate", final: "indeterminate" },
      },
    ],
  },
  {
    id: "F6-negated-modification-with-exclusivity",
    note: "«solo» es un calificador propio (u3) que restringe el alcance de la unidad afirmativa u2; RDA no audita restricts.",
    sin: makeSin("No quiero modificar la reserva, solo consultar disponibilidad", [
      makeUnit("u1", "instruct", "modificar", "negative", "la reserva", "explicit", { polaritySpan: "No" }),
      makeUnit("u2", "instruct", "consultar disponibilidad", "positive", null, "absent"),
      makeUnit("u3", "qualify", "solo", "neutral", null, "absent", {
        relations: [{ type: "restricts", targetUnitId: "u2", evidence: "solo" }],
      }),
    ]),
    variants: [
      {
        id: "preserve-and-query",
        note: "Conserva la reserva y consulta disponibilidad.",
        candidate: makeCandidate("F6-a", ["u1", "u2", "u3"], [
          effect("e1", "preserve_reservation", ["u1"], "reservation", { targetRef: "R1" }),
          effect("e2", "query_availability", ["u2", "u3"], "unknown"),
        ]),
        context: ctx(),
        expected: { rda: "consistent", final: "indeterminate" },
      },
      {
        id: "modifies-prohibited-reservation",
        note: "La candidata modifica la reserva negada.",
        candidate: makeCandidate("F6-b", ["u1", "u2", "u3"], [
          effect("e1", "modify_reservation", ["u1"], "reservation", { targetRef: "R1" }),
          effect("e2", "query_availability", ["u2", "u3"], "unknown"),
        ]),
        context: ctx(),
        expected: { rda: "incompatible", final: "incompatible" },
      },
    ],
  },
  {
    id: "F7-reject-and-correction-without-antecedent",
    note: "Rechazo autónomo neutral y referencia a «lo anterior» sin antecedente recibido.",
    sin: makeSin("Eso no, lo anterior", [
      makeUnit("u1", "reject", null, "neutral", "Eso", "ambiguous", {
        actSpan: "Eso no",
        dependencies: [{ kind: "antecedent", evidence: "Eso" }],
        uncertainty: [{ field: "referent", reason: "No se conoce a qué refiere «Eso»." }],
      }),
      makeUnit("u2", "correct", null, "neutral", "lo anterior", "ambiguous", {
        actSpan: "lo anterior",
        dependencies: [{ kind: "prior_turn", evidence: "lo anterior" }],
        uncertainty: [{ field: "referent", reason: "No se conoce a qué refiere «lo anterior»." }],
        relations: [{ type: "corrects", targetUnitId: "u1", evidence: "lo anterior" }],
      }),
    ]),
    variants: [
      {
        id: "clarify-only",
        note: "La candidata solo pide precisión.",
        candidate: makeCandidate("F7-a", ["u1", "u2"], [effect("e1", "clarify", ["u1", "u2"], "unknown")]),
        context: ctx(),
        expected: { rda: "consistent", final: "indeterminate" },
      },
    ],
  },
];

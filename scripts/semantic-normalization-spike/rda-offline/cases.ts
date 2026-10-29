// Path: scripts/semantic-normalization-spike/rda-offline/cases.ts

import type {
  AuditInput,
  AuditResult,
  EffectKind,
  SemanticUnit,
} from "./evaluator";

export interface DevelopmentCase {
  id: string;
  note: string;
  input: AuditInput;
  expected: {
    integrity: AuditResult;
    candidate: AuditResult;
    result: AuditResult;
    units: Record<string, AuditResult>;
  };
}

const mutatingEffectKinds: EffectKind[] = [
  "cancel_reservation",
  "discard_changes",
  "modify_reservation",
  "confirm_changes",
];

function unit(
  id: string,
  predicate: string,
  polarity: SemanticUnit["polarity"],
  kind: SemanticUnit["referent"]["kind"],
  surface: string | null,
  options: Partial<Pick<SemanticUnit, "validity" | "material" | "prohibitedEffectKinds" | "relations" | "uncertainty">> & {
    certainty?: SemanticUnit["referent"]["certainty"];
    polarityEvidence?: string;
  } = {},
): SemanticUnit {
  const relations = options.relations ?? [];
  return {
    id,
    validity: options.validity ?? "valid",
    material: options.material ?? true,
    predicate,
    polarity,
    referent: {
      kind,
      certainty: options.certainty ?? (surface ? "explicit" : "absent"),
      surface,
    },
    prohibitedEffectKinds: options.prohibitedEffectKinds ?? [],
    relations,
    evidence: [
      ...(predicate ? [{ field: "predicate" as const, text: predicate }] : []),
      ...(polarity === "negative" ? [{ field: "polarity" as const, text: options.polarityEvidence ?? "No" }] : []),
      ...(surface ? [{ field: "referent" as const, text: surface }] : []),
      ...relations.map((relation) => ({ field: "relation" as const, text: relation.evidence })),
    ],
    uncertainty: options.uncertainty ?? [],
  };
}

function context(
  options: Partial<AuditInput["context"]> = {},
): NonNullable<AuditInput["context"]> {
  return {
    source: "fixture:canonical-projection",
    version: "fixture-v1",
    freshness: "current",
    proposalLookup: "complete",
    proposals: [{ id: "P1", status: "pending" }],
    referenceResolutions: [],
    constraints: [],
    ...options,
  };
}

function candidate(
  id: string,
  coveredUnitIds: string[],
  effects: AuditInput["candidate"]["effects"],
  options: Partial<AuditInput["candidate"]> = {},
): AuditInput["candidate"] {
  return {
    id,
    scope: "complete",
    coveredUnitIds,
    mutates: effects.some((effect) => mutatingEffectKinds.includes(effect.kind)),
    effects,
    requiredConstraintIds: [],
    ...options,
  };
}

function effect(
  id: string,
  kind: AuditInput["candidate"]["effects"][number]["kind"],
  unitIds: string[],
  targetKind: AuditInput["candidate"]["effects"][number]["targetKind"],
  options: Partial<AuditInput["candidate"]["effects"][number]> = {},
): AuditInput["candidate"]["effects"][number] {
  return { id, kind, unitIds, targetKind, scopeKeys: [], ...options };
}

function developmentCase(
  id: string,
  note: string,
  message: string,
  units: SemanticUnit[],
  effects: AuditInput["candidate"]["effects"],
  expected: DevelopmentCase["expected"],
  options: {
    sinStatus?: AuditInput["sin"]["status"];
    candidate?: Partial<AuditInput["candidate"]>;
    context?: AuditInput["context"];
  } = {},
): DevelopmentCase {
  return {
    id,
    note,
    input: {
      message,
      sin: { status: options.sinStatus ?? "valid", units },
      candidate: candidate(id, units.map((item) => item.id), effects, options.candidate),
      context: options.context === undefined ? context() : options.context,
    },
    expected,
  };
}

export const developmentCases: DevelopmentCase[] = [
  developmentCase(
    "S01-compatible-pending-changes",
    "Propuesta pendiente inequívoca; candidato descarta cambios sin cancelar reserva.",
    "Quiero cancelar los cambios",
    [unit("u1", "cancelar", "affirmative", "changes", "los cambios")],
    [effect("e1", "discard_changes", ["u1"], "changes", { targetRef: "P1" })],
    { integrity: "consistent", candidate: "consistent", result: "consistent", units: { u1: "consistent" } },
  ),
  developmentCase(
    "S01-incompatible-reservation-substitution",
    "La referencia textual a cambios no respalda cancelar la reserva.",
    "Quiero cancelar los cambios",
    [unit("u1", "cancelar", "affirmative", "changes", "los cambios")],
    [effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" })],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible" } },
  ),
  developmentCase(
    "S02-explicit-negation",
    "La candidata intenta cancelar la reserva negada y descartar cambios pendientes.",
    "No canceles la reserva; descartá los cambios",
    [
      unit("u1", "canceles", "negative", "reservation", "la reserva", { prohibitedEffectKinds: ["cancel_reservation"] }),
      unit("u2", "descartá", "affirmative", "changes", "los cambios"),
    ],
    [
      effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" }),
      effect("e2", "discard_changes", ["u2"], "changes", { targetRef: "P1" }),
    ],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible", u2: "consistent" } },
  ),
  developmentCase(
    "S03-context-missing",
    "No se suministra el antecedente ni la versión del estado a conservar.",
    "Cambié de idea, dejá la reserva como estaba",
    [
      unit("u1", "Cambié de idea", "neutral", "unknown", null),
      unit("u2", "dejá la reserva como estaba", "affirmative", "reservation", "la reserva", { certainty: "explicit", uncertainty: ["No se conoce el estado previo."] }),
    ],
    [effect("e1", "clarify", ["u1", "u2"], "unknown")],
    { integrity: "consistent", candidate: "consistent", result: "consistent", units: { u1: "consistent", u2: "consistent" } },
    { candidate: { mutates: false } },
  ),
  developmentCase(
    "S04-ambiguous-referent",
    "La candidata selecciona una reserva sin resolución contextual para 'todo'.",
    "Cancelá todo",
    [unit("u1", "Cancelá", "affirmative", "unknown", "todo", { certainty: "ambiguous" })],
    [effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" })],
    { integrity: "consistent", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate" } },
  ),
  developmentCase(
    "S04-no-context",
    "La referencia ambigua se audita sin proyección contextual.",
    "Cancelá todo",
    [unit("u1", "Cancelá", "affirmative", "unknown", "todo", { certainty: "ambiguous" })],
    [effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" })],
    { integrity: "consistent", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate" } },
    { context: null },
  ),
  developmentCase(
    "S05-mixed-polarity",
    "Prohíbe mover llegada; cambio de salida requiere preguntar un valor faltante.",
    "No muevas la llegada; cambiá la salida",
    [
      unit("u1", "muevas", "negative", "other", "la llegada", { prohibitedEffectKinds: ["modify_reservation"] }),
      unit("u2", "cambiá", "affirmative", "other", "la salida", { uncertainty: ["Falta el valor de salida solicitado."] }),
    ],
    [
      effect("e1", "modify_reservation", ["u1"], "reservation", { targetRef: "R1" }),
      effect("e2", "clarify", ["u2"], "unknown"),
    ],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible", u2: "consistent" } },
    { candidate: { mutates: true } },
  ),
  developmentCase(
    "S06-rejection-context-unknown",
    "Rechazo autónomo sin historial, con dos instrucciones afirmativas explícitas.",
    "No, gracias; conservá la reserva y eliminá los cambios pendientes",
    [
      unit("u1", "No, gracias", "neutral", "unknown", null, { validity: "partial", uncertainty: ["Antecedente del rechazo no suministrado."] }),
      unit("u2", "conservá", "affirmative", "reservation", "la reserva"),
      unit("u3", "eliminá", "affirmative", "changes", "los cambios pendientes"),
    ],
    [
      effect("e1", "preserve_reservation", ["u2"], "reservation", { targetRef: "R1" }),
      effect("e2", "discard_changes", ["u3"], "changes", { targetRef: "P1" }),
      effect("e3", "clarify", ["u1"], "unknown"),
    ],
    { integrity: "indeterminate", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate", u2: "consistent", u3: "consistent" } },
  ),
  developmentCase(
    "S07-invalid-sin-linkage",
    "SIN adjunta una atribución de confirmación que no está representada por evidencia verificable suficiente.",
    "Sí, dejalo como estaba",
    [
      {
        ...unit("u1", "Sí", "affirmative", "reservation", "lo", { validity: "invalid", uncertainty: ["El antecedente de 'lo' no se conoce."] }),
        evidence: [{ field: "predicate", text: "Sí" }, { field: "referent", text: "lo" }],
      },
    ],
    [effect("e1", "confirm_changes", ["u1"], "proposal", { targetRef: "P1" })],
    { integrity: "indeterminate", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate" } },
    { sinStatus: "invalid" },
  ),
  developmentCase(
    "S08-negated-modification",
    "La consulta es no mutante; la modificación está explícitamente negada.",
    "No quiero modificar la reserva, solo consultar disponibilidad",
    [
      unit("u1", "modificar", "negative", "reservation", "la reserva", { prohibitedEffectKinds: ["modify_reservation"] }),
      unit("u2", "consultar disponibilidad", "affirmative", "unknown", null),
    ],
    [
      effect("e1", "modify_reservation", ["u1"], "reservation", { targetRef: "R1" }),
      effect("e2", "query_availability", ["u2"], "unknown"),
    ],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible", u2: "consistent" } },
  ),
  developmentCase(
    "S09-negated-changes-only",
    "La candidata cancela la reserva, pero no preserva la unidad negativa sobre cambios.",
    "Cancelá la reserva, pero no los cambios",
    [
      unit("u1", "Cancelá", "affirmative", "reservation", "la reserva"),
      unit("u2", "los cambios", "negative", "changes", "los cambios", {
        prohibitedEffectKinds: ["discard_changes"],
        polarityEvidence: "no",
      }),
    ],
    [
      effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" }),
      effect("e2", "discard_changes", ["u2"], "changes", { targetRef: "P1" }),
    ],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "consistent", u2: "incompatible" } },
  ),
  developmentCase(
    "S10-explicit-exception",
    "La fecha de salida se exceptúa, pero la candidata confirma también ese alcance.",
    "Confirmo los cambios, excepto la fecha de salida",
    [
      unit("u1", "Confirmo", "affirmative", "changes", "los cambios"),
      unit("u2", "excepto", "neutral", "other", "la fecha de salida", {
        relations: [{ kind: "excepts", targetUnitId: "u1", scopeKey: "departure_date", evidence: "excepto la fecha de salida" }],
      }),
    ],
    [effect("e1", "confirm_changes", ["u1"], "proposal", { targetRef: "P1", scopeKeys: ["departure_date"] })],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible", u2: "incompatible" } },
  ),
  developmentCase(
    "S11-clarification-candidate",
    "La referencia no se resuelve; la candidata solo pide precisión.",
    "Eso no, lo anterior",
    [
      unit("u1", "Eso no", "neutral", "unknown", "Eso", { certainty: "ambiguous", prohibitedEffectKinds: ["confirm_changes"] }),
      unit("u2", "lo anterior", "neutral", "unknown", "lo anterior", { certainty: "ambiguous" }),
    ],
    [effect("e1", "clarify", ["u1", "u2"], "unknown")],
    { integrity: "consistent", candidate: "consistent", result: "consistent", units: { u1: "consistent", u2: "consistent" } },
    { candidate: { mutates: false } },
  ),
  developmentCase(
    "S12-pending-proposal",
    "La propuesta existe y está pendiente en una proyección vigente.",
    "Descartá la propuesta, pero mantené la reserva",
    [
      unit("u1", "Descartá", "affirmative", "proposal", "la propuesta"),
      unit("u2", "mantené", "affirmative", "reservation", "la reserva"),
    ],
    [
      effect("e1", "discard_changes", ["u1"], "proposal", { targetRef: "P1" }),
      effect("e2", "preserve_reservation", ["u2"], "reservation", { targetRef: "R1" }),
    ],
    { integrity: "consistent", candidate: "consistent", result: "consistent", units: { u1: "consistent", u2: "consistent" } },
  ),
  developmentCase(
    "adverse-no-pending-proposal",
    "La proyección vigente y completa declara inexistente la propuesta P404.",
    "Descartá la propuesta",
    [unit("u1", "Descartá", "affirmative", "proposal", "la propuesta")],
    [effect("e1", "discard_changes", ["u1"], "proposal", { targetRef: "P404" })],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible" } },
    { context: context({ proposals: [{ id: "P404", status: "absent" }] }) },
  ),
  developmentCase(
    "adverse-proposal-freshness-unknown",
    "El contexto está desactualizado; no prueba que la propuesta siga pendiente.",
    "Descartá la propuesta",
    [unit("u1", "Descartá", "affirmative", "proposal", "la propuesta")],
    [effect("e1", "discard_changes", ["u1"], "proposal", { targetRef: "P1" })],
    { integrity: "consistent", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate" } },
    { context: context({ freshness: "stale" }) },
  ),
  developmentCase(
    "adverse-partial-candidate-scope",
    "La candidata declara alcance parcial y no cubre la instrucción material.",
    "Cambiá la salida",
    [unit("u1", "Cambiá", "affirmative", "other", "la salida")],
    [],
    { integrity: "consistent", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate" } },
    { candidate: { scope: "partial", coveredUnitIds: [] } },
  ),
  developmentCase(
    "adverse-unsupported-evidence",
    "SIN atribuye un span que no aparece en el mensaje; candidato no se certifica.",
    "Descartá los cambios",
    [{
      ...unit("u1", "descartá", "affirmative", "changes", "los cambios"),
      evidence: [
        { field: "predicate", text: "cancelá" },
        { field: "referent", text: "los cambios" },
      ],
    }],
    [effect("e1", "discard_changes", ["u1"], "changes", { targetRef: "P1" })],
    { integrity: "incompatible", candidate: "indeterminate", result: "incompatible", units: { u1: "indeterminate" } },
  ),
  developmentCase(
    "adverse-complete-candidate-omits-prohibition",
    "La candidata completa omite la unidad negativa material.",
    "No canceles la reserva; descartá los cambios",
    [
      unit("u1", "canceles", "negative", "reservation", "la reserva", { prohibitedEffectKinds: ["cancel_reservation"] }),
      unit("u2", "descartá", "affirmative", "changes", "los cambios"),
    ],
    [effect("e1", "discard_changes", ["u2"], "changes", { targetRef: "P1" })],
    { integrity: "consistent", candidate: "indeterminate", result: "indeterminate", units: { u1: "indeterminate", u2: "consistent" } },
    { candidate: { coveredUnitIds: ["u2"] } },
  ),
  developmentCase(
    "adverse-partial-interpretation",
    "La prohibición es íntegra; la referencia de la segunda unidad se abstiene.",
    "No canceles la reserva; descartá eso",
    [
      unit("u1", "canceles", "negative", "reservation", "la reserva", { prohibitedEffectKinds: ["cancel_reservation"] }),
      unit("u2", "descartá", "affirmative", "unknown", "eso", {
        validity: "abstained",
        certainty: "ambiguous",
        uncertainty: ["El antecedente de 'eso' no se interpreta."],
      }),
    ],
    [
      effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" }),
      effect("e2", "discard_changes", ["u2"], "changes", { targetRef: "P1" }),
    ],
    { integrity: "indeterminate", candidate: "incompatible", result: "incompatible", units: { u1: "incompatible", u2: "indeterminate" } },
  ),
  developmentCase(
    "adverse-ambiguous-canonical-resolution",
    "La proyección resuelve el referente ambiguo a una propuesta identificada.",
    "Descartá eso",
    [unit("u1", "Descartá", "affirmative", "unknown", "eso", { certainty: "ambiguous" })],
    [effect("e1", "discard_changes", ["u1"], "proposal", { targetRef: "P1" })],
    { integrity: "consistent", candidate: "consistent", result: "consistent", units: { u1: "consistent" } },
    {
      context: context({
        referenceResolutions: [{ unitId: "u1", status: "resolved", targetKind: "proposal", targetRef: "P1" }],
      }),
    },
  ),
  developmentCase(
    "adverse-constraint-violated",
    "La candidata declara una condición canónica necesaria que el fixture marca violada.",
    "Cancelá la reserva",
    [unit("u1", "Cancelá", "affirmative", "reservation", "la reserva")],
    [effect("e1", "cancel_reservation", ["u1"], "reservation", { targetRef: "R1" })],
    { integrity: "consistent", candidate: "incompatible", result: "incompatible", units: { u1: "consistent" } },
    {
      candidate: { requiredConstraintIds: ["explicit-confirmation"] },
      context: context({
        constraints: [{ id: "explicit-confirmation", status: "violated", source: "fixture:guard", evidence: "confirmation absent" }],
      }),
    },
  ),
];

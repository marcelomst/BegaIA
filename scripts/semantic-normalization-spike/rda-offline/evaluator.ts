// Path: scripts/semantic-normalization-spike/rda-offline/evaluator.ts

export type AuditResult = "consistent" | "incompatible" | "indeterminate";
export type IntegrityStatus = AuditResult;
export type UnitValidity = "valid" | "partial" | "abstained" | "invalid";
export type ReferentKind = "reservation" | "changes" | "proposal" | "other" | "unknown";
export type ReferentCertainty = "explicit" | "ambiguous" | "absent";
export type EffectKind =
  | "cancel_reservation"
  | "discard_changes"
  | "modify_reservation"
  | "confirm_changes"
  | "preserve_reservation"
  | "query_availability"
  | "clarify"
  | "other";

export interface EvidenceSpan {
  field: "predicate" | "polarity" | "referent" | "relation";
  text: string;
}

export interface SemanticRelation {
  kind: "excepts" | "contradicts";
  targetUnitId: string;
  scopeKey?: string;
  evidence: string;
}

export interface SemanticUnit {
  id: string;
  validity: UnitValidity;
  material: boolean;
  predicate: string;
  polarity: "affirmative" | "negative" | "neutral";
  referent: {
    kind: ReferentKind;
    certainty: ReferentCertainty;
    surface: string | null;
  };
  prohibitedEffectKinds: EffectKind[];
  relations: SemanticRelation[];
  evidence: EvidenceSpan[];
  uncertainty: string[];
}

export interface SinInterpretation {
  status: "valid" | "partial" | "invalid" | "absent";
  units: SemanticUnit[];
}

export interface CandidateEffect {
  id: string;
  unitIds: string[];
  kind: EffectKind;
  targetKind: ReferentKind;
  targetRef?: string;
  scopeKeys: string[];
}

export interface AuditCandidate {
  id: string;
  scope: "complete" | "partial";
  coveredUnitIds: string[];
  mutates: boolean;
  effects: CandidateEffect[];
  requiredConstraintIds: string[];
}

export interface ContextProjection {
  source: string;
  version: string;
  freshness: "current" | "stale" | "unknown";
  proposalLookup: "complete" | "incomplete" | "unknown";
  proposals: Array<{
    id: string;
    status: "pending" | "absent" | "unknown";
  }>;
  referenceResolutions: Array<{
    unitId: string;
    status: "resolved" | "ambiguous" | "unresolved";
    targetKind?: ReferentKind;
    targetRef?: string;
  }>;
  constraints: Array<{
    id: string;
    status: "satisfied" | "violated" | "unknown";
    source: string;
    evidence: string;
  }>;
}

export interface AuditInput {
  message: string;
  sin: SinInterpretation;
  candidate: AuditCandidate;
  context: ContextProjection | null;
}

export interface AuditFinding {
  rule: string;
  result: AuditResult;
  detail: string;
  unitIds: string[];
  evidence: string[];
  contextRefs: string[];
  missingInformation: string[];
}

export interface UnitAudit {
  unitId: string;
  result: AuditResult;
  findings: AuditFinding[];
  uncertainty: string[];
}

export interface IntegrityAudit {
  result: IntegrityStatus;
  findings: AuditFinding[];
  limitations: string[];
}

export interface AuditReport {
  candidateId: string | null;
  integrity: IntegrityAudit;
  units: UnitAudit[];
  relations: AuditFinding[];
  candidateResult: AuditResult;
  result: AuditResult;
  rulesApplied: string[];
  missingInformation: string[];
  limitations: string[];
}

const EFFECT_KINDS = new Set<EffectKind>([
  "cancel_reservation",
  "discard_changes",
  "modify_reservation",
  "confirm_changes",
  "preserve_reservation",
  "query_availability",
  "clarify",
  "other",
]);

const REFERENT_KINDS = new Set<ReferentKind>([
  "reservation",
  "changes",
  "proposal",
  "other",
  "unknown",
]);

const MUTATING_EFFECT_KINDS = new Set<EffectKind>([
  "cancel_reservation",
  "discard_changes",
  "modify_reservation",
  "confirm_changes",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValue<T extends string>(values: Set<T>, value: unknown): value is T {
  return typeof value === "string" && values.has(value as T);
}

function makeFinding(
  rule: string,
  result: AuditResult,
  detail: string,
  options: Partial<Pick<AuditFinding, "unitIds" | "evidence" | "contextRefs" | "missingInformation">> = {},
): AuditFinding {
  return {
    rule,
    result,
    detail,
    unitIds: options.unitIds ?? [],
    evidence: options.evidence ?? [],
    contextRefs: options.contextRefs ?? [],
    missingInformation: options.missingInformation ?? [],
  };
}

function combineResults(results: AuditResult[]): AuditResult {
  if (results.includes("incompatible")) return "incompatible";
  if (results.includes("indeterminate")) return "indeterminate";
  return "consistent";
}

function validInputShape(value: unknown): value is AuditInput {
  if (!validSinEnvelope(value) || !isRecord(value.candidate)) {
    return false;
  }
  const { candidate } = value;
  if (
    !isNonEmptyString(candidate.id) ||
    !["complete", "partial"].includes(String(candidate.scope)) ||
    !Array.isArray(candidate.coveredUnitIds) ||
    !candidate.coveredUnitIds.every(isNonEmptyString) ||
    typeof candidate.mutates !== "boolean" ||
    !Array.isArray(candidate.effects) ||
    !candidate.effects.every(validateCandidateEffect) ||
    !Array.isArray(candidate.requiredConstraintIds) ||
    !candidate.requiredConstraintIds.every(isNonEmptyString)
  ) {
    return false;
  }
  if (value.context === null) return true;
  if (!isRecord(value.context)) return false;
  const context = value.context;
  return (
    isNonEmptyString(context.source) &&
    isNonEmptyString(context.version) &&
    ["current", "stale", "unknown"].includes(String(context.freshness)) &&
    ["complete", "incomplete", "unknown"].includes(String(context.proposalLookup)) &&
    Array.isArray(context.proposals) &&
    context.proposals.every((proposal) =>
      isRecord(proposal) &&
      isNonEmptyString(proposal.id) &&
      ["pending", "absent", "unknown"].includes(String(proposal.status))
    ) &&
    Array.isArray(context.referenceResolutions) &&
    context.referenceResolutions.every((reference) =>
      isRecord(reference) &&
      isNonEmptyString(reference.unitId) &&
      ["resolved", "ambiguous", "unresolved"].includes(String(reference.status)) &&
      (reference.targetKind === undefined || hasValue(REFERENT_KINDS, reference.targetKind)) &&
      (reference.targetRef === undefined || isNonEmptyString(reference.targetRef))
    ) &&
    Array.isArray(context.constraints)
    && context.constraints.every((constraint) =>
      isRecord(constraint) &&
      isNonEmptyString(constraint.id) &&
      ["satisfied", "violated", "unknown"].includes(String(constraint.status)) &&
      isNonEmptyString(constraint.source) &&
      typeof constraint.evidence === "string"
    )
  );
}

function validSinEnvelope(
  value: unknown,
): value is Record<string, unknown> & Pick<AuditInput, "message" | "sin"> {
  if (!isRecord(value) || typeof value.message !== "string" || !isRecord(value.sin)) return false;
  return (
    ["valid", "partial", "invalid", "absent"].includes(String(value.sin.status)) &&
    Array.isArray(value.sin.units)
  );
}

function validateUnitShape(unit: unknown): unit is SemanticUnit {
  if (!isRecord(unit) || !isRecord(unit.referent)) return false;
  return (
    isNonEmptyString(unit.id) &&
    ["valid", "partial", "abstained", "invalid"].includes(String(unit.validity)) &&
    typeof unit.material === "boolean" &&
    isNonEmptyString(unit.predicate) &&
    ["affirmative", "negative", "neutral"].includes(String(unit.polarity)) &&
    hasValue(REFERENT_KINDS, unit.referent.kind) &&
    ["explicit", "ambiguous", "absent"].includes(String(unit.referent.certainty)) &&
    (unit.referent.surface === null || typeof unit.referent.surface === "string") &&
    Array.isArray(unit.prohibitedEffectKinds) &&
    unit.prohibitedEffectKinds.every((item) => hasValue(EFFECT_KINDS, item)) &&
    Array.isArray(unit.relations) &&
    unit.relations.every(validRelationShape) &&
    Array.isArray(unit.evidence) &&
    unit.evidence.every((item) =>
      isRecord(item) &&
      ["predicate", "polarity", "referent", "relation"].includes(String(item.field)) &&
      isNonEmptyString(item.text)
    ) &&
    Array.isArray(unit.uncertainty) &&
    unit.uncertainty.every(isNonEmptyString)
  );
}

function validateCandidateEffect(effect: unknown): effect is CandidateEffect {
  if (!isRecord(effect)) return false;
  return (
    isNonEmptyString(effect.id) &&
    Array.isArray(effect.unitIds) &&
    effect.unitIds.every(isNonEmptyString) &&
    hasValue(EFFECT_KINDS, effect.kind) &&
    hasValue(REFERENT_KINDS, effect.targetKind) &&
    (effect.targetRef === undefined || isNonEmptyString(effect.targetRef)) &&
    Array.isArray(effect.scopeKeys) &&
    effect.scopeKeys.every(isNonEmptyString)
  );
}

function validRelationShape(relation: unknown): relation is SemanticRelation {
  if (!isRecord(relation)) return false;
  return (
    ["excepts", "contradicts"].includes(String(relation.kind)) &&
    isNonEmptyString(relation.targetUnitId) &&
    (relation.scopeKey === undefined || isNonEmptyString(relation.scopeKey)) &&
    isNonEmptyString(relation.evidence)
  );
}

function validateContextDetails(context: ContextProjection): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const validProposals = context.proposals.every((proposal) =>
    isRecord(proposal) &&
    isNonEmptyString(proposal.id) &&
    ["pending", "absent", "unknown"].includes(String(proposal.status))
  );
  const validReferences = context.referenceResolutions.every((reference) =>
    isRecord(reference) &&
    isNonEmptyString(reference.unitId) &&
    ["resolved", "ambiguous", "unresolved"].includes(String(reference.status)) &&
    (reference.targetKind === undefined || hasValue(REFERENT_KINDS, reference.targetKind)) &&
    (reference.targetRef === undefined || isNonEmptyString(reference.targetRef))
  );
  const validConstraints = context.constraints.every((constraint) =>
    isRecord(constraint) &&
    isNonEmptyString(constraint.id) &&
    ["satisfied", "violated", "unknown"].includes(String(constraint.status)) &&
    isNonEmptyString(constraint.source) &&
    typeof constraint.evidence === "string"
  );
  if (!validProposals || !validReferences || !validConstraints) {
    findings.push(makeFinding(
      "context-structure",
      "indeterminate",
      "La proyección contextual contiene datos malformados y no se puede auditar con seguridad.",
      { missingInformation: ["Una proyección contextual válida con fuente, versión y colecciones tipadas."] },
    ));
  }
  for (const [label, ids] of [
    ["propuesta", context.proposals.map((item) => item.id)],
    ["resolución", context.referenceResolutions.map((item) => item.unitId)],
    ["restricción", context.constraints.map((item) => item.id)],
  ] as const) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        findings.push(makeFinding(
          "context-duplicate-id",
          "indeterminate",
          `La proyección contiene IDs duplicados de ${label} (${id}); no se selecciona un registro arbitrario.`,
          {
            contextRefs: [id],
            missingInformation: [`Un único registro no contradictorio para ${label} ${id}.`],
          },
        ));
      }
      seen.add(id);
    }
  }
  return findings;
}

function verifyIntegrity(input: Pick<AuditInput, "message" | "sin">): IntegrityAudit {
  const findings: AuditFinding[] = [];
  const limitations = [
    "La evidencia literal verifica soporte textual, no comprensión semántica.",
    "La integridad de SIN no certifica que su interpretación sea correcta.",
    "La integridad evalúa unidades SIN y su evidencia; no evalúa compatibilidad candidata ni autentica contexto.",
  ];

  if (input.sin.status === "absent" || input.sin.status === "invalid") {
    findings.push(makeFinding(
      "sin-availability",
      "indeterminate",
      `La interpretación SIN está marcada como ${input.sin.status}.`,
      { missingInformation: ["Una interpretación SIN estructuralmente utilizable."] },
    ));
  }

  if (input.sin.status === "partial") {
    findings.push(makeFinding(
      "sin-partial",
      "indeterminate",
      "SIN declara una interpretación parcial; las unidades ausentes no se reconstruyen.",
      { missingInformation: ["Identificación de las unidades relevantes no interpretadas."] },
    ));
  }

  const unitIds = new Set<string>();
  for (const candidateUnit of input.sin.units as unknown[]) {
    if (!validateUnitShape(candidateUnit)) {
      const unitId = isRecord(candidateUnit) && isNonEmptyString(candidateUnit.id)
        ? candidateUnit.id
        : undefined;
      findings.push(makeFinding(
        "sin-unit-structure",
        "indeterminate",
        "Una unidad SIN está malformada y no puede evaluarse.",
        {
          unitIds: unitId ? [unitId] : [],
          missingInformation: ["Una unidad SIN válida con identificador, polaridad, referente, evidencia e incertidumbre."],
        },
      ));
      continue;
    }

    const unit = candidateUnit;
    if (unitIds.has(unit.id)) {
      findings.push(makeFinding(
        "sin-duplicate-unit",
        "indeterminate",
        `El identificador de unidad ${unit.id} está duplicado.`,
        { unitIds: [unit.id], missingInformation: ["Identificadores de unidad únicos."] },
      ));
    }
    unitIds.add(unit.id);

    if (unit.validity !== "valid") {
      findings.push(makeFinding(
        "sin-unit-validity",
        "indeterminate",
        `La unidad ${unit.id} está marcada como ${unit.validity}.`,
        {
          unitIds: [unit.id],
          missingInformation: unit.uncertainty.length > 0 ? unit.uncertainty : ["Interpretación íntegra de esta unidad."],
        },
      ));
    }
    if ((unit.validity === "partial" || unit.validity === "abstained") && unit.uncertainty.length === 0) {
      findings.push(makeFinding(
        "sin-uncertainty",
        "indeterminate",
        `La unidad ${unit.id} declara interpretación parcial/abstención sin describir la incertidumbre.`,
        { unitIds: [unit.id], missingInformation: ["Descripción explícita de la incertidumbre de la unidad."] },
      ));
    }
    if (
      (unit.referent.certainty === "absent" && unit.referent.surface !== null) ||
      (unit.referent.certainty !== "absent" && !isNonEmptyString(unit.referent.surface))
    ) {
      findings.push(makeFinding(
        "sin-referent-shape",
        "indeterminate",
        `La representación del referente de ${unit.id} no concuerda con su estado de determinación.`,
        { unitIds: [unit.id], missingInformation: ["Superficie y estado del referente estructuralmente coherentes."] },
      ));
    }

    const requiredEvidence: Array<{ field: EvidenceSpan["field"]; text: string }> = [];
    if (unit.predicate) requiredEvidence.push({ field: "predicate", text: unit.predicate });
    if (unit.polarity === "negative") {
      const marker = unit.evidence.find((item) => item.field === "polarity")?.text;
      if (marker) {
        requiredEvidence.push({ field: "polarity", text: marker });
      } else {
        findings.push(makeFinding(
          "sin-polarity-evidence-missing",
          "indeterminate",
          `La unidad negativa ${unit.id} no aporta evidencia textual para su polaridad.`,
          { unitIds: [unit.id], missingInformation: ["Span literal que respalde la polaridad negativa."] },
        ));
      }
    }
    if (unit.referent.surface) requiredEvidence.push({ field: "referent", text: unit.referent.surface });
    for (const relation of unit.relations as unknown[]) {
      if (!validRelationShape(relation)) {
        findings.push(makeFinding(
          "sin-relation-structure",
          "indeterminate",
          `Una relación de ${unit.id} está malformada.`,
          { unitIds: [unit.id], missingInformation: ["Relación explícita y evidencia asociada."] },
        ));
        continue;
      }
      requiredEvidence.push({ field: "relation", text: relation.evidence });
    }
    for (const evidenceItem of unit.evidence as unknown[]) {
      if (
        !isRecord(evidenceItem) ||
        !["predicate", "polarity", "referent", "relation"].includes(String(evidenceItem.field)) ||
        !isNonEmptyString(evidenceItem.text)
      ) {
        findings.push(makeFinding(
          "sin-evidence-structure",
          "indeterminate",
          `La evidencia de ${unit.id} está malformada.`,
          { unitIds: [unit.id], missingInformation: ["Evidencia textual estructurada."] },
        ));
      }
    }
    for (const required of requiredEvidence) {
      const matching = unit.evidence.some((item) =>
        isRecord(item) && item.field === required.field && item.text === required.text
      );
      if (!matching) {
        findings.push(makeFinding(
          "sin-evidence-missing",
          "indeterminate",
          `Falta evidencia ${required.field} asociada a ${unit.id}.`,
          { unitIds: [unit.id], missingInformation: [`Evidencia literal para ${required.field}: ${required.text}`] },
        ));
      }
      if (!input.message.includes(required.text)) {
        findings.push(makeFinding(
          "sin-evidence-not-literal",
          "incompatible",
          `La evidencia declarada para ${unit.id} no aparece literalmente en el mensaje original.`,
          { unitIds: [unit.id], evidence: [required.text] },
        ));
      }
    }
    for (const evidenceItem of unit.evidence) {
      if (!input.message.includes(evidenceItem.text)) {
        findings.push(makeFinding(
          "sin-evidence-not-literal",
          "incompatible",
          `Un span de evidencia de ${unit.id} no aparece literalmente en el mensaje original.`,
          { unitIds: [unit.id], evidence: [evidenceItem.text] },
        ));
      }
    }
  }

  if (input.sin.units.length === 0 && input.sin.status === "valid") {
    findings.push(makeFinding(
      "sin-empty",
      "indeterminate",
      "SIN declara estado válido sin unidades interpretadas.",
      { missingInformation: ["Unidades SIN o abstención explícita."] },
    ));
  }

  return {
    result: combineResults(findings.map((finding) => finding.result)),
    findings,
    limitations,
  };
}

function currentContext(context: ContextProjection | null): context is ContextProjection {
  return Boolean(context && context.freshness === "current");
}

function contextFreshnessFinding(unitId?: string): AuditFinding {
  return makeFinding(
    "context-freshness",
    "indeterminate",
    "La condición depende de contexto ausente o cuya vigencia solo está declarada como desactualizada/desconocida.",
    {
      unitIds: unitId ? [unitId] : [],
      missingInformation: ["Proyección contextual canónica con fuente, versión y vigencia verificable."],
    },
  );
}

function auditUnit(
  input: AuditInput,
  unit: SemanticUnit,
  integrity: IntegrityAudit,
): UnitAudit {
  const findings: AuditFinding[] = [];
  const unitIntegrity = integrity.findings.filter((finding) => finding.unitIds.includes(unit.id));
  if (unit.validity !== "valid" || unitIntegrity.some((finding) => finding.result !== "consistent")) {
    findings.push(makeFinding(
      "unit-not-verifiable",
      "indeterminate",
      `La unidad ${unit.id} no está suficientemente verificada para evaluar la candidata.`,
      {
        unitIds: [unit.id],
        evidence: unit.evidence.map((item) => item.text),
        missingInformation: unit.uncertainty.length > 0 ? unit.uncertainty : ["Integridad verificable de la unidad SIN."],
      },
    ));
    return { unitId: unit.id, result: "indeterminate", findings, uncertainty: [...unit.uncertainty] };
  }

  const effects = input.candidate.effects
    .filter(validateCandidateEffect)
    .filter((effect) => effect.unitIds.includes(unit.id));
  if (input.candidate.scope === "complete" && unit.material && !input.candidate.coveredUnitIds.includes(unit.id)) {
    findings.push(makeFinding(
      "complete-candidate-omits-unit",
      "indeterminate",
      `La candidata declara alcance completo pero no aporta cobertura verificable para la unidad material ${unit.id}.`,
      {
        unitIds: [unit.id],
        evidence: unit.evidence.map((item) => item.text),
        missingInformation: ["Cobertura y efecto explícitos para la unidad material omitida."],
      },
    ));
  } else if (input.candidate.scope === "partial" && unit.material && !input.candidate.coveredUnitIds.includes(unit.id)) {
    findings.push(makeFinding(
      "partial-candidate-out-of-scope",
      "indeterminate",
      `La unidad material ${unit.id} queda fuera del alcance declarado por la candidata.`,
      { unitIds: [unit.id], missingInformation: ["Auditoría explícita de la unidad omitida."] },
    ));
  }

  if (unit.polarity === "negative" && (
    unit.referent.certainty === "absent" ||
    unit.referent.kind === "unknown" ||
    unit.prohibitedEffectKinds.length === 0
  )) {
    findings.push(makeFinding(
      "negative-scope-incomplete",
      "indeterminate",
      `La unidad negativa ${unit.id} carece de alcance estructurado suficiente para comprobar sus efectos.`,
      {
        unitIds: [unit.id],
        evidence: unit.evidence.filter((item) => item.field === "polarity").map((item) => item.text),
        missingInformation: ["Referente identificable y efectos prohibidos explícitos para la unidad negativa."],
      },
    ));
  }

  if (unit.material && effects.length === 0) {
    findings.push(makeFinding(
      "candidate-unit-effect-missing",
      "indeterminate",
      `No hay un efecto comprobable ni una respuesta no mutante explícita asociada a la unidad material ${unit.id}.`,
      { unitIds: [unit.id], missingInformation: ["Efecto vinculado a la unidad o respuesta explícita de aclaración."] },
    ));
  }

  for (const effect of effects) {
    if (unit.polarity === "negative" && unit.prohibitedEffectKinds.includes(effect.kind)) {
      findings.push(makeFinding(
        "explicit-negation-vs-effect",
        "incompatible",
        `El efecto ${effect.kind} contradice la prohibición explícita asociada a ${unit.id}.`,
        { unitIds: [unit.id], evidence: unit.evidence.filter((item) => item.field === "polarity").map((item) => item.text) },
      ));
    }

    if (
      (unit.referent.kind === "changes" || unit.referent.kind === "proposal") &&
      ((effect.kind === "cancel_reservation" && effect.targetKind === "reservation") ||
        (effect.kind === "discard_changes" && effect.targetKind === "reservation"))
    ) {
      findings.push(makeFinding(
        "referent-substitution",
        "incompatible",
        `La candidata dirige a la reserva un efecto vinculado por SIN a ${unit.referent.kind}.`,
        { unitIds: [unit.id], evidence: [unit.referent.surface ?? ""].filter(Boolean) },
      ));
    }

    if (unit.referent.certainty === "ambiguous" && effect.targetKind !== "unknown") {
      if (!currentContext(input.context)) {
        findings.push(contextFreshnessFinding(unit.id));
      } else {
        const resolutions = input.context.referenceResolutions.filter((item) => item.unitId === unit.id);
        const resolution = resolutions.length === 1 ? resolutions[0] : undefined;
        if (resolutions.length > 1) {
          findings.push(makeFinding(
            "context-duplicate-resolution",
            "indeterminate",
            `Hay varias resoluciones contextuales para ${unit.id}; no se selecciona una arbitrariamente.`,
            { unitIds: [unit.id], missingInformation: ["Una única resolución contextual no contradictoria."] },
          ));
        } else if (!resolution || resolution.status !== "resolved") {
          findings.push(makeFinding(
            "ambiguous-referent",
            "indeterminate",
            `El referente de ${unit.id} es ambiguo y no existe resolución canónica vigente suministrada.`,
            {
              unitIds: [unit.id],
              evidence: unit.referent.surface ? [unit.referent.surface] : [],
              missingInformation: ["Resultado vigente de resolución canónica para esta unidad."],
            },
          ));
        } else if (
          !resolution.targetKind ||
          !resolution.targetRef
        ) {
          findings.push(makeFinding(
            "ambiguous-resolution-incomplete",
            "indeterminate",
            `La resolución contextual de ${unit.id} no aporta identidad canónica suficiente.`,
            { unitIds: [unit.id], missingInformation: ["Tipo y referencia canónica resueltos."] },
          ));
        } else if (
          resolution.targetKind !== effect.targetKind ||
          effect.targetRef !== resolution.targetRef
        ) {
          findings.push(makeFinding(
            "candidate-target-mismatch",
            "incompatible",
            `El target declarado por la candidata contradice la resolución contextual suministrada para ${unit.id}.`,
            {
              unitIds: [unit.id],
              contextRefs: [resolution.targetRef ?? ""].filter(Boolean),
            },
          ));
        }
      }
    }

    if (
      (effect.kind === "discard_changes" || effect.kind === "confirm_changes") &&
      (effect.targetKind === "changes" || effect.targetKind === "proposal")
    ) {
      const proposalId = effect.targetRef;
      if (!proposalId || !currentContext(input.context) || input.context.proposalLookup !== "complete") {
        findings.push(contextFreshnessFinding(unit.id));
      } else {
        const proposals = input.context.proposals.filter((item) => item.id === proposalId);
        const proposal = proposals.length === 1 ? proposals[0] : undefined;
        if (proposals.length > 1) {
          findings.push(makeFinding(
            "context-duplicate-proposal",
            "indeterminate",
            `Hay varios registros para la propuesta ${proposalId}; no se selecciona uno arbitrariamente.`,
            { unitIds: [unit.id], contextRefs: [proposalId], missingInformation: ["Un único registro no contradictorio de la propuesta."] },
          ));
        } else if (!proposal || proposal.status === "absent") {
          findings.push(makeFinding(
            "proposal-not-pending",
            "incompatible",
            `La candidata depende de la propuesta ${proposalId}, que la proyección canónica vigente declara inexistente.`,
            { unitIds: [unit.id], contextRefs: [proposalId] },
          ));
        } else if (proposal.status === "unknown") {
          findings.push(makeFinding(
            "proposal-status-unknown",
            "indeterminate",
            `No se puede verificar el estado de la propuesta ${proposalId}.`,
            { unitIds: [unit.id], contextRefs: [proposalId], missingInformation: ["Estado verificable de la propuesta."] },
          ));
        }
      }
    }
  }

  for (const relationSource of input.sin.units.filter(validateUnitShape)) {
    for (const relation of relationSource.relations) {
      const affectedUnitId = relation.targetUnitId;
      const affectedEffects = input.candidate.effects
        .filter(validateCandidateEffect)
        .filter((candidateEffect) =>
          candidateEffect.unitIds.includes(affectedUnitId) &&
          candidateEffect.kind === "confirm_changes" &&
          candidateEffect.scopeKeys.includes(relation.scopeKey ?? "")
        );
      if (
        relation.kind === "excepts" &&
        (relationSource.id === unit.id || relation.targetUnitId === unit.id) &&
        affectedEffects.length > 0
      ) {
        findings.push(makeFinding(
          "explicit-exception-vs-confirmation",
          "incompatible",
          `La candidata confirma el alcance ${relation.scopeKey ?? "(no especificado)"} que la unidad ${relationSource.id} exceptúa.`,
          {
            unitIds: [relationSource.id, relation.targetUnitId],
            evidence: [relation.evidence],
          },
        ));
      }
    }
  }
  for (const relation of unit.relations) {
    if (relation.kind === "contradicts") {
      findings.push(makeFinding(
        "sin-unit-contradiction",
        "indeterminate",
        `SIN declara una relación contradictoria entre ${unit.id} y ${relation.targetUnitId}; requiere adjudicación.`,
        {
          unitIds: [unit.id, relation.targetUnitId],
          evidence: [relation.evidence],
          missingInformation: ["Adjudicación de la relación contradictoria entre unidades."],
        },
      ));
    }
  }

  if (findings.length === 0) {
    findings.push(makeFinding(
      "unit-no-detected-conflict",
      "consistent",
      `No se detectó incompatibilidad para ${unit.id} dentro del alcance declarado.`,
      { unitIds: [unit.id], evidence: unit.evidence.map((item) => item.text) },
    ));
  }

  return {
    unitId: unit.id,
    result: combineResults(findings.map((finding) => finding.result)),
    findings,
    uncertainty: [...unit.uncertainty],
  };
}

function auditCandidateConstraints(input: AuditInput): AuditFinding[] {
  const findings: AuditFinding[] = input.context ? validateContextDetails(input.context) : [];
  const knownUnitIds = new Set(
    input.sin.units.filter(validateUnitShape).map((unit) => unit.id),
  );
  for (const resolution of input.context?.referenceResolutions ?? []) {
    if (!knownUnitIds.has(resolution.unitId)) {
      findings.push(makeFinding(
        "context-resolution-unit-missing",
        "indeterminate",
        `La resolución contextual referencia la unidad inexistente ${resolution.unitId}.`,
        { unitIds: [resolution.unitId], missingInformation: [`Unidad SIN ${resolution.unitId} verificable.`] },
      ));
    }
  }
  for (const constraintId of input.candidate.requiredConstraintIds) {
    if (!currentContext(input.context)) {
      findings.push(contextFreshnessFinding());
      continue;
    }
    const constraints = input.context.constraints.filter((item) => item.id === constraintId);
    if (constraints.length > 1) {
      findings.push(makeFinding(
        "context-duplicate-constraint",
        "indeterminate",
        `Hay varios registros para la condición ${constraintId}; no se selecciona uno arbitrariamente.`,
        { contextRefs: [constraintId], missingInformation: ["Un único registro no contradictorio de la condición."] },
      ));
      continue;
    }
    const constraint = constraints[0];
    if (!constraint || constraint.status === "unknown") {
      findings.push(makeFinding(
        "canonical-constraint-unknown",
        "indeterminate",
        `La condición canónica ${constraintId} no está verificada en la proyección.`,
        { missingInformation: [`Resultado vigente de ${constraintId}.`] },
      ));
    } else if (constraint.status === "violated") {
      findings.push(makeFinding(
        "canonical-constraint-violated",
        "incompatible",
        `La condición canónica ${constraintId} está declarada como incumplida.`,
        { evidence: constraint.evidence ? [constraint.evidence] : [], contextRefs: [constraint.source] },
      ));
    } else {
      findings.push(makeFinding(
        "canonical-constraint-supplied",
        "consistent",
        `La proyección declara satisfecha la condición ${constraintId}; RDA no la revalida.`,
        { evidence: constraint.evidence ? [constraint.evidence] : [], contextRefs: [constraint.source] },
      ));
    }
  }
  return findings;
}

function auditCandidateStructure(input: AuditInput): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const knownUnitIds = new Set(
    input.sin.units.filter(validateUnitShape).map((unit) => unit.id),
  );
  const effectIds = new Set<string>();
  const effects = input.candidate.effects.filter(validateCandidateEffect);

  for (const effect of input.candidate.effects as unknown[]) {
    if (!validateCandidateEffect(effect)) {
      findings.push(makeFinding(
        "candidate-effect-structure",
        "indeterminate",
        "Un efecto declarado por la candidata está malformado.",
        { missingInformation: ["Efecto explícito con unidades asociadas, tipo y referente declarado."] },
      ));
      continue;
    }
    if (effectIds.has(effect.id)) {
      findings.push(makeFinding(
        "candidate-duplicate-effect",
        "indeterminate",
        `El identificador de efecto ${effect.id} está duplicado.`,
        { missingInformation: ["Identificadores de efecto únicos."] },
      ));
    }
    effectIds.add(effect.id);
    if (effect.unitIds.length === 0) {
      findings.push(makeFinding(
        "candidate-effect-unmapped",
        "indeterminate",
        `El efecto ${effect.id} no está asociado a ninguna unidad SIN.`,
        { missingInformation: ["Al menos una unidad SIN identificada para cada efecto candidato."] },
      ));
    }
    for (const unitId of effect.unitIds) {
      if (!knownUnitIds.has(unitId)) {
        findings.push(makeFinding(
          "candidate-effect-unit-missing",
          "indeterminate",
          `El efecto ${effect.id} referencia la unidad inexistente ${unitId}.`,
          { unitIds: [unitId], missingInformation: [`Unidad SIN ${unitId} verificable.`] },
        ));
      }
    }
  }

  for (const unitId of input.candidate.coveredUnitIds) {
    if (!knownUnitIds.has(unitId)) {
      findings.push(makeFinding(
        "candidate-covered-unit-missing",
        "indeterminate",
        `La candidata declara cobertura de la unidad inexistente ${unitId}.`,
        { unitIds: [unitId], missingInformation: [`Unidad SIN ${unitId} verificable.`] },
      ));
    }
  }

  if (effects.length === 0 && input.candidate.mutates) {
    findings.push(makeFinding(
      "candidate-mutation-without-effects",
      "indeterminate",
      "La candidata declara que muta, pero no aporta efectos comprobables.",
      { missingInformation: ["Efectos candidatos explícitos asociados a unidades."] },
    ));
  } else if (effects.some((effect) => effect.kind === "other")) {
    findings.push(makeFinding(
      "candidate-effect-mutability-unknown",
      "indeterminate",
      "Al menos un efecto tiene tipo other y no permite comprobar la declaración mutates.",
      { missingInformation: ["Tipo de efecto explícito para verificar mutabilidad."] },
    ));
  } else if (
    effects.length > 0 &&
    input.candidate.mutates !== effects.some((effect) => MUTATING_EFFECT_KINDS.has(effect.kind))
  ) {
    findings.push(makeFinding(
      "candidate-mutates-effect-mismatch",
      "incompatible",
      "La declaración mutates contradice los efectos declarados por la candidata.",
      { missingInformation: ["Declaración mutates coherente con los efectos candidatos."] },
    ));
  }

  return findings;
}

function auditRelations(input: AuditInput, integrity: IntegrityAudit): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const units = new Map(
    input.sin.units.filter(validateUnitShape).map((unit) => [unit.id, unit]),
  );
  for (const unit of units.values()) {
    for (const relation of unit.relations.filter(validRelationShape)) {
      if (relation.kind === "excepts" && !relation.scopeKey) {
        findings.push(makeFinding(
          "exception-scope-missing",
          "indeterminate",
          `La excepción declarada por ${unit.id} no aporta un scopeKey verificable.`,
          {
            unitIds: [unit.id, relation.targetUnitId],
            evidence: [relation.evidence],
            missingInformation: ["scopeKey explícito para determinar el alcance de la excepción."],
          },
        ));
      }
      if (!units.has(relation.targetUnitId)) {
        findings.push(makeFinding(
          "relation-target-missing",
          "indeterminate",
          `La relación de ${unit.id} apunta a una unidad que no está presente.`,
          {
            unitIds: [unit.id, relation.targetUnitId],
            evidence: [relation.evidence],
            missingInformation: [`Unidad ${relation.targetUnitId}.`],
          },
        ));
      } else if (
        !integrity.findings.some((finding) =>
          finding.rule === "sin-unit-validity" &&
          finding.unitIds.some((unitId) => unitId === relation.targetUnitId || unitId === unit.id)
        )
      ) {
        findings.push(makeFinding(
          `relation-${relation.kind}`,
          "consistent",
          `La relación ${relation.kind} se conserva como dato SIN adjudicado; no se infiere otra relación.`,
          { unitIds: [unit.id, relation.targetUnitId], evidence: [relation.evidence] },
        ));
      } else {
        findings.push(makeFinding(
          `relation-${relation.kind}`,
          "indeterminate",
          `La relación ${relation.kind} incluye una unidad no íntegra.`,
          { unitIds: [unit.id, relation.targetUnitId], evidence: [relation.evidence] },
        ));
      }
    }
  }
  return findings;
}

export function evaluateRda(inputValue: unknown): AuditReport {
  if (!validInputShape(inputValue)) {
    const finding = makeFinding(
      "input-structure",
      "indeterminate",
      "La entrada experimental está ausente o malformada; no se inventa una interpretación alternativa.",
      { missingInformation: ["Entrada con mensaje, SIN, candidata y proyección contextual estructuralmente válidos."] },
    );
    const integrity = validSinEnvelope(inputValue)
      ? verifyIntegrity(inputValue)
      : {
        result: "indeterminate" as const,
        findings: [finding],
        limitations: ["La entrada no permitió verificar las unidades SIN y su evidencia."],
      };
    const candidateResult: AuditResult = "indeterminate";
    return {
      candidateId: null,
      integrity,
      units: [],
      relations: [],
      candidateResult,
      result: combineResults([integrity.result, candidateResult]),
      rulesApplied: ["input-structure"],
      missingInformation: finding.missingInformation,
      limitations: [
        "No se ejecutó auditoría candidata semántica ni contextual.",
        "source, version y freshness son declaraciones de entrada; no se autentican ni se contrastan con estado operacional.",
        "Ningún resultado autoriza una operación.",
      ],
    };
  }

  const input = inputValue;
  const integrity = verifyIntegrity(input);
  const rawUnits: unknown[] = input.sin.units;
  const units = rawUnits.flatMap((candidateUnit) => {
    if (validateUnitShape(candidateUnit)) {
      return [auditUnit(input, candidateUnit, integrity)];
    }
    if (!isRecord(candidateUnit) || !isNonEmptyString(candidateUnit.id)) return [];
    const unitId = candidateUnit.id;
    const findings = integrity.findings.filter((finding) => finding.unitIds.includes(unitId));
    return [{
      unitId,
      result: "indeterminate" as const,
      findings,
      uncertainty: [],
    }];
  });
  const relations = auditRelations(input, integrity);
  const candidateFindings = [
    ...auditCandidateStructure(input),
    ...auditCandidateConstraints(input),
  ];
  const candidateResults = [
    ...units.map((unit) => unit.result),
    ...relations.map((relation) => relation.result),
    ...candidateFindings.map((finding) => finding.result),
  ];
  const candidateResult = candidateResults.length === 0
    ? "indeterminate"
    : combineResults(candidateResults);
  const result = combineResults([integrity.result, candidateResult]);
  const allFindings = [
    ...integrity.findings,
    ...units.flatMap((unit) => unit.findings),
    ...relations,
    ...candidateFindings,
  ];

  return {
    candidateId: input.candidate.id,
    integrity,
    units,
    relations,
    candidateResult,
    result,
    rulesApplied: [...new Set(allFindings.map((finding) => finding.rule))],
    missingInformation: [...new Set(allFindings.flatMap((finding) => finding.missingInformation))],
    limitations: [
      ...integrity.limitations,
      "La auditoría se limita a relaciones y estados explícitamente suministrados.",
      "source, version y freshness son declaraciones de entrada; RDA no autentica fuentes ni consulta el estado operacional real.",
      "No consulta runtime, base de datos ni proveedor.",
      "Ningún resultado autoriza una operación.",
    ],
  };
}

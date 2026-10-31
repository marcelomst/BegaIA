// Path: scripts/semantic-normalization-spike/sin-v2/sin-v2.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateRda } from "../rda-offline/evaluator";
import type { AuditReport, AuditResult } from "../rda-offline/evaluator";
import {
  ADAPTER_TABLES_VERSION,
  PROHIBITION_TABLE,
  REFERENT_LEXICON,
  SCOPE_TABLE,
  adaptSinV2ToRda,
  aggregateFinalResult,
  normalizeText,
} from "./adapter";
import {
  effect,
  makeCandidate,
  makeSin,
  makeUnit,
  sinV2Fixtures,
  type SinV2Fixture,
} from "./fixtures";
import { validateSinV2 } from "./validator";

const RANK: Record<AuditResult, number> = { consistent: 0, indeterminate: 1, incompatible: 2 };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fixture(id: string): SinV2Fixture {
  const found = sinV2Fixtures.find((item) => item.id.startsWith(id));
  assert.ok(found, `fixture ${id}`);
  return found;
}

function run(sin: unknown, variant: SinV2Fixture["variants"][number]) {
  const adapted = adaptSinV2ToRda({ sin, candidate: variant.candidate, context: variant.context });
  const rdaReport = evaluateRda(adapted.rdaInput);
  return { ...adapted, ...aggregateFinalResult(rdaReport, adapted.adaptationReport) };
}

function issueCodes(input: unknown): string[] {
  return validateSinV2(input).issues.map((item) => item.code);
}

const validSin = () => clone(fixture("F2").sin);

// --- Contrato y validador -------------------------------------------------

test("all hand-written fixtures satisfy the structural contract", () => {
  for (const item of sinV2Fixtures) {
    const result = validateSinV2(item.sin);
    assert.equal(result.valid, true, `${item.id}: ${JSON.stringify(result.issues)}`);
  }
  assert.equal(new Set(sinV2Fixtures.map((item) => item.id)).size, sinV2Fixtures.length);
});

test("schema rejects unknown keys, bad enums and wrong schema tag", () => {
  const extra = { ...validSin(), extra: 1 };
  assert.ok(issueCodes(extra).includes("schema"));

  const badEnum = validSin();
  (badEnum.units[0] as unknown as { act: string }).act = "authorize";
  assert.ok(issueCodes(badEnum).includes("schema"));

  assert.ok(issueCodes({ ...validSin(), schema: "sin-v1" }).includes("schema"));
  assert.ok(issueCodes(null).includes("schema"));
});

test("validator rejects authorization, effect and target fields instead of ignoring them", () => {
  for (const key of ["authorized", "effects", "targetRef", "scopeKey", "material", "prohibitedEffectKinds", "confidence"]) {
    const input = validSin();
    (input.units[0] as unknown as Record<string, unknown>)[key] = key === "effects" ? [] : true;
    const result = validateSinV2(input);
    assert.equal(result.valid, false, key);
    assert.ok(result.issues.some((item) => item.code === "forbidden-field"), key);
  }
});

test("validator checks unique ids, relation targets, self references and cycles", () => {
  const dup = clone(fixture("F1").sin);
  dup.units[1]!.id = "u1";
  assert.ok(issueCodes(dup).includes("duplicate-unit-id"));

  const missing = clone(fixture("F7").sin);
  missing.units[1]!.relations[0]!.targetUnitId = "u9";
  assert.ok(issueCodes(missing).includes("relation-target-missing"));

  const self = clone(fixture("F7").sin);
  self.units[1]!.relations[0]!.targetUnitId = "u2";
  assert.ok(issueCodes(self).includes("relation-self-reference"));

  const cycle = clone(fixture("F7").sin);
  cycle.units[0]!.relations = [{ type: "qualifies", targetUnitId: "u2", evidence: "Eso no" }];
  cycle.units[0]!.evidence.push({ field: "relation", span: "Eso no" });
  assert.ok(issueCodes(cycle).includes("relation-cycle"));
});

test("validator enforces literal evidence and does not repair invalid output", () => {
  const bad = validSin();
  bad.units[0]!.evidence[0] = { field: "predicate", span: "anular" };
  const snapshot = clone(bad);
  const result = validateSinV2(bad);
  assert.equal(result.valid, false);
  assert.equal(result.output, null);
  assert.deepEqual(bad, snapshot, "input is not mutated or repaired");
  assert.ok(result.issues.some((item) => item.code === "evidence-not-literal"));
  assert.ok(result.issues.some((item) => item.code === "predicate-evidence-missing"));

  const predicate = validSin();
  predicate.units[0]!.predicate = "anular";
  assert.ok(issueCodes(predicate).includes("predicate-not-literal"));

  const referent = validSin();
  referent.units[0]!.referent.surface = "la estadía";
  assert.ok(issueCodes(referent).includes("referent-not-literal"));
});

test("a literally valid span does not certify the interpretation", () => {
  const wrong = makeSin("Quiero cancelar los cambios", [
    makeUnit("u1", "instruct", "cancelar", "negative", "los cambios", "explicit", { polaritySpan: "cancelar" }),
  ]);
  assert.equal(validateSinV2(wrong).valid, true, "polaridad errónea con spans literales no se detecta estructuralmente");
});

test("referent structure: explicit, ambiguous and absent states", () => {
  const absentWithSurface = validSin();
  absentWithSurface.units[0]!.referent.resolution = "absent";
  assert.ok(issueCodes(absentWithSurface).includes("referent-shape"));

  const explicitWithoutSurface = validSin();
  explicitWithoutSurface.units[0]!.referent = { surface: null, resolution: "explicit" };
  assert.ok(issueCodes(explicitWithoutSurface).includes("referent-shape"));

  const ambiguousNoUncertainty = clone(fixture("F1").sin);
  ambiguousNoUncertainty.units[1]!.uncertainty = [];
  assert.ok(issueCodes(ambiguousNoUncertainty).includes("referent-uncertainty-required"));

  assert.equal(validateSinV2(fixture("F6").sin).valid, true, "referente ausente legítimo en u2");
});

test("negation evidence, predicate rules and mandatory uncertainty", () => {
  const noPolarity = clone(fixture("F1").sin);
  noPolarity.units[0]!.evidence = noPolarity.units[0]!.evidence.filter((item) => item.field !== "polarity");
  assert.ok(issueCodes(noPolarity).includes("polarity-evidence-missing"));

  const needsPredicate = validSin();
  needsPredicate.units[0]!.predicate = null;
  assert.ok(issueCodes(needsPredicate).includes("predicate-required"));

  const negativeRejection = clone(fixture("F7").sin);
  negativeRejection.units[0]!.polarity = "negative";
  assert.ok(issueCodes(negativeRejection).includes("predicateless-polarity"));

  const noActEvidence = clone(fixture("F7").sin);
  noActEvidence.units[0]!.evidence = noActEvidence.units[0]!.evidence.filter((item) => item.field !== "act");
  assert.ok(issueCodes(noActEvidence).includes("act-evidence-missing"));

  const partial = validSin();
  partial.units[0]!.status = "partial";
  assert.ok(issueCodes(partial).includes("uncertainty-required"));
});

test("global status coherence", () => {
  const abstainedGlobal = validSin();
  abstainedGlobal.status = "abstained";
  assert.ok(issueCodes(abstainedGlobal).includes("global-status-mismatch"));

  const completeWithPartial = validSin();
  completeWithPartial.units[0]!.status = "partial";
  completeWithPartial.units[0]!.uncertainty = [{ field: "unit", reason: "Parcial." }];
  assert.ok(issueCodes(completeWithPartial).includes("global-status-mismatch"));

  assert.ok(issueCodes({ ...validSin(), units: [] }).includes("empty-units"));
  assert.equal(validateSinV2({ ...validSin(), units: [], status: "abstained" }).valid, true);
});

// --- Adaptación -----------------------------------------------------------

test("adapter maps tables deterministically and keeps the referent state", () => {
  const f1 = fixture("F1");
  const { rdaInput, adaptationReport } = adaptSinV2ToRda({ sin: f1.sin, candidate: f1.variants[0]!.candidate, context: f1.variants[0]!.context });
  const [u1, u2] = rdaInput.sin.units;
  assert.equal(u1!.polarity, "negative");
  assert.deepEqual(u1!.referent, { kind: "reservation", certainty: "explicit", surface: "la reserva" });
  assert.deepEqual(u1!.prohibitedEffectKinds, ["cancel_reservation"]);
  assert.equal(u2!.referent.certainty, "ambiguous");
  assert.equal(u2!.referent.kind, "unknown");
  assert.equal(u2!.validity, "valid", "la dependencia no altera la validez; se degrada en la agregación");
  assert.ok(adaptationReport.entries.some((item) => item.unitId === "u2" && item.kind === "dependency-unsupported" && item.material));
  assert.equal(adaptationReport.tablesVersion, ADAPTER_TABLES_VERSION);
  assert.equal(normalizeText("¡Cancelá  LA reserva!"), "cancela la reserva");
  assert.equal(REFERENT_LEXICON["los cambios"], "changes");
  assert.equal(PROHIBITION_TABLE["modify|reservation"], "modify_reservation");
  assert.equal(SCOPE_TABLE["la fecha de salida"], "departure_date");
});

test("adapter passes candidate and context through untouched and creates no effects", () => {
  for (const item of sinV2Fixtures) {
    for (const variant of item.variants) {
      const candidateSnapshot = clone(variant.candidate);
      const { rdaInput } = adaptSinV2ToRda({ sin: item.sin, candidate: variant.candidate, context: variant.context });
      assert.deepEqual(rdaInput.candidate, candidateSnapshot);
      assert.deepEqual(rdaInput.context, variant.context);
    }
  }
});

test("autonomous rejection stays neutral and its act span is preserved as evidence", () => {
  const f7 = fixture("F7");
  const { rdaInput, adaptationReport } = adaptSinV2ToRda({ sin: f7.sin, candidate: f7.variants[0]!.candidate, context: f7.variants[0]!.context });
  const u1 = rdaInput.sin.units[0]!;
  assert.equal(u1.polarity, "neutral");
  assert.equal(u1.predicate, "Eso no");
  assert.ok(u1.evidence.some((item) => item.field === "predicate" && item.text === "Eso no"));
  assert.ok(adaptationReport.entries.some((item) => item.unitId === "u1" && item.kind === "predicate-substituted" && !item.material));
  assert.deepEqual(u1.prohibitedEffectKinds, []);
});

test("unknown equivalences are preserved as uncertainty, never invented", () => {
  const variant = {
    ...fixture("F2").variants[0]!,
    candidate: makeCandidate("c", ["u1"], [effect("e1", "preserve_reservation", ["u1"], "reservation", { targetRef: "R1" })]),
  };

  const unknownVerb = makeSin("No anules la reserva", [
    makeUnit("u1", "instruct", "anules", "negative", "la reserva", "explicit", { polaritySpan: "No" }),
  ]);
  const verb = run(unknownVerb, variant);
  assert.deepEqual(verb.rdaInput.sin.units[0]!.prohibitedEffectKinds, []);
  assert.ok(verb.adaptationReport.entries.some((item) => item.kind === "prohibition-unmapped" && item.material));
  assert.notEqual(verb.finalResult, "consistent");

  const unknownReferent = makeSin("Quiero cancelar la estadía", [
    makeUnit("u1", "instruct", "cancelar", "positive", "la estadía", "explicit"),
  ]);
  const referent = run(unknownReferent, variant);
  assert.equal(referent.rdaInput.sin.units[0]!.referent.kind, "unknown");
  assert.ok(referent.adaptationReport.entries.some((item) => item.kind === "referent-kind-unmapped" && item.material));
  assert.notEqual(referent.finalResult, "consistent");
});

test("exception scope: mapped surface yields scopeKey, unmapped one is reported", () => {
  const mapped = fixture("F5-");
  const mappedRun = adaptSinV2ToRda({ sin: mapped.sin, candidate: mapped.variants[0]!.candidate, context: mapped.variants[0]!.context });
  assert.equal(mappedRun.rdaInput.sin.units[1]!.relations[0]!.scopeKey, "departure_date");
  assert.equal(mappedRun.adaptationReport.entries.length, 0);

  const unmapped = fixture("F5b");
  const unmappedRun = run(unmapped.sin, unmapped.variants[0]!);
  assert.equal(unmappedRun.rdaInput.sin.units[1]!.relations[0]!.scopeKey, undefined);
  assert.ok(unmappedRun.adaptationReport.entries.some((item) => item.kind === "scope-unmapped"));
  assert.notEqual(unmappedRun.finalResult, "consistent");
});

test("corrections, restrictions and context dependencies RDA cannot audit are reported and block consistent", () => {
  const f6 = run(fixture("F6").sin, fixture("F6").variants[0]!);
  assert.equal(f6.rdaReport.result, "consistent", "RDA por sí solo no ve la exclusividad");
  assert.ok(f6.adaptationReport.entries.some((item) => item.kind === "relation-unsupported" && item.material));
  assert.equal(f6.finalResult, "indeterminate");

  const f3 = run(fixture("F3").sin, fixture("F3").variants[0]!);
  const kinds = f3.adaptationReport.entries.map((item) => `${item.unitId}:${item.kind}`);
  assert.ok(kinds.includes("u1:dependency-unsupported"));
  assert.ok(kinds.includes("u2:dependency-unsupported"));
  assert.ok(!kinds.some((item) => item.endsWith("relation-unsupported")), "F3 no declara relaciones intra-mensaje");
  assert.equal(f3.rdaInput.sin.units[0]!.validity, "valid");
  assert.ok(f3.rdaInput.sin.units[1]!.uncertainty.some((item) => item.includes("prior_state")));
  assert.equal(f3.finalResult, "indeterminate");

  const f4 = run(fixture("F4").sin, fixture("F4").variants[0]!);
  assert.equal(f4.adaptationReport.entries.filter((item) => item.kind === "dependency-unsupported").length, 3);
});

test("non-material unsupported relations do not floor the result", () => {
  const sin = makeSin("Gracias, perfecto", [
    makeUnit("u1", "discourse", null, "neutral", null, "absent", { actSpan: "Gracias" }),
    makeUnit("u2", "discourse", null, "neutral", null, "absent", {
      actSpan: "perfecto",
      relations: [{ type: "qualifies", targetUnitId: "u1", evidence: "perfecto" }],
    }),
  ]);
  const variant = { ...fixture("F2").variants[0]!, candidate: makeCandidate("c", ["u1", "u2"], []) };
  const result = run(sin, variant);
  const entry = result.adaptationReport.entries.find((item) => item.kind === "relation-unsupported");
  assert.ok(entry);
  assert.equal(entry.material, false);
  assert.equal(result.reasons.length, 0);
});

// --- Agregación y propiedades --------------------------------------------

test("every fixture variant matches its predeclared RDA and final result", () => {
  for (const item of sinV2Fixtures) {
    for (const variant of item.variants) {
      const result = run(item.sin, variant);
      assert.equal(result.rdaReport.result, variant.expected.rda, `${item.id}/${variant.id}: rda`);
      assert.equal(result.finalResult, variant.expected.final, `${item.id}/${variant.id}: final`);
    }
  }
});

test("aggregation never improves the RDA verdict", () => {
  for (const item of sinV2Fixtures) {
    for (const variant of item.variants) {
      const result = run(item.sin, variant);
      assert.ok(RANK[result.finalResult] >= RANK[result.rdaReport.result], `${item.id}/${variant.id}`);
    }
  }
  const fake = (result: AuditResult) => ({ result }) as unknown as AuditReport;
  const clean = { tablesVersion: "t", validation: { valid: true, issues: [] }, entries: [], limitations: [] };
  const material = {
    ...clean,
    entries: [{ unitId: "u1", kind: "relation-unsupported" as const, disposition: "not_projected" as const, material: true, detail: "" }],
  };
  assert.equal(aggregateFinalResult(fake("incompatible"), material).finalResult, "incompatible");
  assert.equal(aggregateFinalResult(fake("indeterminate"), clean).finalResult, "indeterminate");
  assert.equal(aggregateFinalResult(fake("consistent"), clean).finalResult, "consistent");
  assert.equal(aggregateFinalResult(fake("consistent"), material).finalResult, "indeterminate");
});

test("known detectable degradations never turn a non-consistent baseline into consistent", () => {
  // Alcance acotado: solo las transformaciones catalogadas aquí; no se promete monotonía general.
  for (const item of sinV2Fixtures) {
    for (const variant of item.variants) {
      const baseline = run(item.sin, variant).finalResult;

      const withDependency = clone(item.sin);
      for (const unit of withDependency.units) {
        unit.dependencies.push({ kind: "prior_turn", evidence: unit.evidence[0]!.span });
      }
      // Estricto: una dependencia declarada no oculta contradicciones ni mejora el dictamen.
      assert.ok(RANK[run(withDependency, variant).finalResult] >= RANK[baseline], `${item.id}/${variant.id}: dependency`);

      const withPartial = clone(item.sin);
      for (const unit of withPartial.units) {
        unit.status = "partial";
        if (unit.uncertainty.length === 0) unit.uncertainty.push({ field: "unit", reason: "Degradación de prueba." });
      }
      withPartial.status = "partial";

      const unmappedScope = clone(item.sin);
      for (const unit of unmappedScope.units) {
        for (const relation of unit.relations) if (relation.type === "excepts") relation.scopeSurface = "la fecha";
      }

      // Débil: RDA puede bajar incompatible a indeterminate si la interpretación es parcial o falta alcance verificable.
      for (const [label, degraded] of [["partial", withPartial], ["scope", unmappedScope]] as const) {
        const final = run(degraded, variant).finalResult;
        if (baseline !== "consistent") {
          assert.notEqual(final, "consistent", `${item.id}/${variant.id}: ${label}`);
        }
      }
    }
  }
});

test("invalid SIN output yields at least indeterminate and is traced in adaptationReport", () => {
  const f2 = fixture("F2");
  const bad = clone(f2.sin);
  bad.units[0]!.evidence = [{ field: "predicate", span: "anular" }];
  const result = run(bad, f2.variants[0]!);
  assert.equal(result.adaptationReport.validation.valid, false);
  assert.ok(result.adaptationReport.validation.issues.length > 0);
  assert.equal(result.rdaInput.sin.status, "invalid");
  assert.notEqual(result.finalResult, "consistent");
  assert.ok(result.reasons.length > 0);

  const garbage = run("no es un objeto", f2.variants[0]!);
  assert.notEqual(garbage.finalResult, "consistent");
});

test("adaptationReport traces every declared dependency and unsupported relation", () => {
  for (const item of sinV2Fixtures) {
    const expectedDependencies = item.sin.units.reduce((sum, unit) => sum + unit.dependencies.length, 0);
    const expectedRelations = item.sin.units.reduce(
      (sum, unit) => sum + unit.relations.filter((relation) => relation.type !== "excepts" && relation.type !== "contradicts").length,
      0,
    );
    const { adaptationReport } = adaptSinV2ToRda({ sin: item.sin, candidate: item.variants[0]!.candidate, context: item.variants[0]!.context });
    const traced = (kind: string) => adaptationReport.entries.filter((entry) => entry.kind === kind).length;
    assert.equal(traced("dependency-unsupported"), expectedDependencies, item.id);
    assert.equal(traced("relation-unsupported"), expectedRelations, item.id);
  }
});

test("adaptation is deterministic and does not mutate its input", () => {
  for (const item of sinV2Fixtures) {
    const input = { sin: item.sin, candidate: item.variants[0]!.candidate, context: item.variants[0]!.context };
    const snapshot = clone(input);
    const first = adaptSinV2ToRda(input);
    const second = adaptSinV2ToRda(input);
    assert.deepEqual(first, second, item.id);
    assert.deepEqual(input, snapshot, item.id);
  }
});

test("projected evidence stays literal and reports declare that nothing authorizes operations", () => {
  for (const item of sinV2Fixtures) {
    const result = run(item.sin, item.variants[0]!);
    for (const unit of result.rdaInput.sin.units) {
      for (const span of unit.evidence) assert.ok(item.sin.message.includes(span.text), `${item.id}/${unit.id}`);
    }
    assert.ok(result.rdaReport.limitations.length > 0);
    assert.ok(result.adaptationReport.limitations.some((text) => text.includes("Ningún resultado autoriza operaciones")));
  }
});

// --- Correcciones de revisión independiente -------------------------------

function cancelCandidate(unitIds: string[]) {
  return { ...fixture("F2").variants[0]!, candidate: makeCandidate("c", unitIds, [effect("e1", "cancel_reservation", unitIds, "reservation", { targetRef: "R1" })]) };
}

test("H-1: autonomous rejection over a mapped referent cannot yield consistent against a mutating candidate", () => {
  const sin = makeSin("No, la reserva no", [makeUnit("u1", "reject", null, "neutral", "la reserva", "explicit", { actSpan: "No" })]);
  assert.equal(validateSinV2(sin).valid, true);
  const result = run(sin, cancelCandidate(["u1"]));
  assert.equal(result.rdaReport.result, "consistent", "rdaReport no se altera artificialmente");
  const entry = result.adaptationReport.entries.find((item) => item.kind === "rejection-not-projected");
  assert.ok(entry && entry.material && entry.unitId === "u1");
  assert.ok(entry.detail.includes("la reserva"), "conserva el referente");
  assert.deepEqual(result.rdaInput.sin.units[0]!.prohibitedEffectKinds, [], "no inventa prohibiciones");
  assert.ok(result.rdaInput.sin.units[0]!.evidence.some((item) => item.text === "No"), "conserva evidencia literal");
  assert.equal(result.finalResult, "indeterminate");
  assert.equal(result.rdaInput.candidate.effects.length, 1, "no añade efectos");
});

test("H-1: retract without a mapped prohibition is reported; elliptical correct/retract are structurally valid (L-1)", () => {
  const retract = makeSin("Mejor no", [makeUnit("u1", "retract", null, "neutral", null, "absent", { actSpan: "Mejor no" })]);
  assert.equal(validateSinV2(retract).valid, true);
  const result = run(retract, cancelCandidate(["u1"]));
  assert.ok(result.adaptationReport.entries.some((item) => item.kind === "rejection-not-projected" && item.material));
  assert.notEqual(result.finalResult, "consistent");

  const correct = clone(fixture("F7").sin);
  assert.equal(correct.units[1]!.act, "correct");
  assert.equal(correct.units[1]!.predicate, null);
  assert.equal(validateSinV2(correct).valid, true);

  const noEvidence = clone(correct);
  noEvidence.units[1]!.evidence = noEvidence.units[1]!.evidence.filter((item) => item.field !== "act");
  assert.ok(issueCodes(noEvidence).includes("act-evidence-missing"));
  const negative = clone(correct);
  negative.units[1]!.polarity = "negative";
  assert.ok(issueCodes(negative).includes("predicateless-polarity"));
});

test("M-1: partial or abstained interpretation is traced without inventing incompatibility", () => {
  const evidence = { polaritySpan: "No" };
  const full = makeSin("No canceles la reserva", [makeUnit("u1", "instruct", "canceles", "negative", "la reserva", "explicit", evidence)]);
  const partial = makeSin("No canceles la reserva", [
    makeUnit("u1", "instruct", "canceles", "negative", "la reserva", "explicit", {
      ...evidence,
      status: "partial",
      uncertainty: [{ field: "unit", reason: "Interpretación incompleta." }],
    }),
  ], "partial");
  const variant = cancelCandidate(["u1"]);

  const complete = run(full, variant);
  assert.equal(complete.rdaReport.result, "incompatible");
  assert.equal(complete.adaptationReport.entries.length, 0);

  const degraded = run(partial, variant);
  assert.equal(degraded.rdaReport.result, "indeterminate", "RDA ya no puede demostrar la contradicción");
  assert.equal(degraded.finalResult, "indeterminate", "no se inventa incompatible");
  const kinds = degraded.adaptationReport.entries.map((item) => `${item.unitId}:${item.kind}`);
  assert.ok(kinds.includes("u1:interpretation-partial"));
  assert.ok(kinds.includes("$global:interpretation-partial"));

  const abstained = makeSin("No canceles la reserva", [], "abstained");
  const gone = run(abstained, variant);
  assert.ok(gone.adaptationReport.entries.some((item) => item.unitId === "$global" && item.material));
  assert.notEqual(gone.finalResult, "consistent");
});

test("M-2: contextual inform is material; autonomous inform is not", () => {
  const noCandidateEffects = { ...fixture("F2").variants[0]!, candidate: makeCandidate("c", ["u1"], []) };

  const autonomous = makeSin("La reserva es para dos personas", [makeUnit("u1", "inform", "es para dos personas", "positive", "La reserva", "explicit")]);
  const auto = run(autonomous, noCandidateEffects);
  assert.equal(auto.adaptationReport.entries.filter((item) => item.material).length, 0);
  assert.equal(auto.finalResult, auto.rdaReport.result);

  const withDependency = makeSin("Eso ya pasó", [
    makeUnit("u1", "inform", "ya pasó", "neutral", "Eso", "ambiguous", {
      dependencies: [{ kind: "antecedent", evidence: "Eso" }],
      uncertainty: [{ field: "referent", reason: "No se conoce a qué refiere «Eso»." }],
    }),
  ]);
  const contextual = run(withDependency, noCandidateEffects);
  assert.equal(contextual.rdaInput.sin.units[0]!.material, true);
  assert.ok(contextual.adaptationReport.entries.some((item) => item.kind === "dependency-unsupported" && item.material));
  assert.equal(contextual.finalResult, "indeterminate");

  const ambiguousOnly = makeSin("Eso ya pasó", [
    makeUnit("u1", "inform", "ya pasó", "neutral", "Eso", "ambiguous", {
      uncertainty: [{ field: "referent", reason: "Referente no determinable." }],
    }),
  ]);
  assert.equal(run(ambiguousOnly, noCandidateEffects).finalResult, "indeterminate");
});

test("M-3: ambiguous referent needs referent uncertainty but not a prior_turn dependency", () => {
  const sin = makeSin("Cancelá reserva", [
    makeUnit("u1", "instruct", "Cancelá", "positive", "reserva", "ambiguous", {
      uncertainty: [{ field: "referent", reason: "No queda claro si es una reserva concreta." }],
    }),
  ]);
  assert.equal(validateSinV2(sin).valid, true, "la ambigüedad no exige dependencias");
  const noReason = clone(sin);
  noReason.units[0]!.uncertainty = [];
  assert.ok(issueCodes(noReason).includes("referent-uncertainty-required"));

  const clarify = { ...fixture("F2").variants[0]!, candidate: makeCandidate("c", ["u1"], [effect("e1", "clarify", ["u1"], "unknown")]) };
  const result = run(sin, clarify);
  assert.equal(result.rdaReport.result, "consistent", "referente léxicamente mapeable: RDA solo no lo frena");
  assert.ok(result.adaptationReport.entries.some((item) => item.kind === "referent-ambiguous" && item.material));
  assert.equal(result.finalResult, "indeterminate");

  const eso = makeSin("Cancelá eso", [
    makeUnit("u1", "instruct", "Cancelá", "positive", "eso", "ambiguous", {
      uncertainty: [{ field: "referent", reason: "No se conoce a qué refiere «eso»." }],
    }),
  ]);
  const esoResult = run(eso, clarify);
  assert.ok(esoResult.adaptationReport.entries.some((item) => item.kind === "referent-ambiguous"));
  assert.equal(esoResult.finalResult, "indeterminate");
});

test("F6: «solo» is a separate qualifier restricting the affirmative unit, and stays unaudited", () => {
  const f6 = fixture("F6").sin;
  const u3 = f6.units.find((unit) => unit.id === "u3")!;
  assert.equal(u3.act, "qualify");
  assert.deepEqual(u3.relations.map((item) => `${item.type}->${item.targetUnitId}`), ["restricts->u2"]);
  assert.equal(f6.units.find((unit) => unit.id === "u2")!.relations.length, 0);
  const result = run(f6, fixture("F6").variants[0]!);
  assert.ok(result.adaptationReport.entries.some((item) => item.unitId === "u3" && item.kind === "relation-unsupported" && item.material));
  assert.equal(result.finalResult, "indeterminate");
});

// Path: scripts/semantic-normalization-spike/rda-offline/evaluator.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";

import { developmentCases } from "./cases";
import { evaluateRda } from "./evaluator";

test("development fixtures have unique IDs and explicit expected outcomes", () => {
  assert.equal(new Set(developmentCases.map((item) => item.id)).size, developmentCases.length);
  assert.ok(developmentCases.length >= 12);
  for (const item of developmentCases) {
    assert.ok(item.expected.result);
    assert.ok(item.expected.integrity);
    assert.ok(item.expected.candidate);
  }
});

test("deterministic evaluator matches each predeclared fixture expectation", () => {
  for (const item of developmentCases) {
    const report = evaluateRda(item.input);
    assert.equal(report.integrity.result, item.expected.integrity, `${item.id}: integrity`);
    assert.equal(report.candidateResult, item.expected.candidate, `${item.id}: candidate`);
    assert.equal(report.result, item.expected.result, `${item.id}: aggregate`);
    assert.deepEqual(
      Object.fromEntries(report.units.map((unit) => [unit.unitId, unit.result])),
      item.expected.units,
      `${item.id}: per-unit outcomes`,
    );
  }
});

test("aggregation preserves uncertainty even when another unit is incompatible", () => {
  const item = developmentCases.find((candidate) => candidate.id === "adverse-partial-interpretation");
  assert.ok(item);
  const report = evaluateRda(item.input);
  assert.equal(report.result, "incompatible");
  assert.equal(report.units.find((unit) => unit.unitId === "u1")?.result, "incompatible");
  assert.equal(report.units.find((unit) => unit.unitId === "u2")?.result, "indeterminate");
  assert.ok(report.missingInformation.some((value) => value.includes("antecedente")));
  assert.equal(report.integrity.result, "indeterminate");
  assert.equal(report.candidateResult, "incompatible");
});

test("consistent clarification remains non-mutating and does not create authorization fields", () => {
  const item = developmentCases.find((candidate) => candidate.id === "S11-clarification-candidate");
  assert.ok(item);
  const report = evaluateRda(item.input);
  assert.equal(report.result, "consistent");
  assert.equal(item.input.candidate.mutates, false);
  assert.equal("authorized" in report, false);
  assert.equal("canExecute" in report, false);
  assert.equal("approvedOperation" in report, false);
});

test("malformed input is indeterminate and does not synthesize another interpretation", () => {
  const report = evaluateRda({ message: "No canceles", sin: null });
  assert.equal(report.result, "indeterminate");
  assert.equal(report.units.length, 0);
  assert.ok(report.missingInformation.length > 0);
});

test("malformed nested SIN data is reported per unit without throwing", () => {
  const source = developmentCases[0].input;
  const report = evaluateRda({
    ...source,
    sin: {
      status: "valid",
      units: [{ ...source.sin.units[0], evidence: null }],
    },
  });
  assert.equal(report.integrity.result, "indeterminate");
  assert.equal(report.units[0]?.unitId, source.sin.units[0]?.id);
  assert.equal(report.units[0]?.result, "indeterminate");
});

test("negative polarity without a textual span remains indeterminate", () => {
  const source = developmentCases.find((item) => item.id === "S02-explicit-negation");
  assert.ok(source);
  const report = evaluateRda({
    ...source.input,
    sin: {
      ...source.input.sin,
      units: source.input.sin.units.map((unit) => ({
        ...unit,
        evidence: unit.id === "u1"
          ? unit.evidence.filter((span) => span.field !== "polarity")
          : unit.evidence,
      })),
    },
  });
  assert.equal(report.integrity.result, "indeterminate");
  assert.equal(report.units.find((unit) => unit.unitId === "u1")?.result, "indeterminate");
});

test("a complete candidate needs a mapped effect or explicit non-mutating response", () => {
  const source = developmentCases[0].input;
  const report = evaluateRda({
    ...source,
    candidate: { ...source.candidate, mutates: false, effects: [] },
  });
  assert.equal(report.integrity.result, "consistent");
  assert.equal(report.candidateResult, "indeterminate");
  assert.equal(report.units[0]?.result, "indeterminate");
  assert.ok(report.rulesApplied.includes("candidate-unit-effect-missing"));

  const malformedCandidate = evaluateRda({
    ...source,
    candidate: { ...source.candidate, effects: [null] },
  });
  assert.equal(malformedCandidate.integrity.result, "consistent");
  assert.equal(malformedCandidate.candidateResult, "indeterminate");
});

test("unmapped and dangling candidate effects remain indeterminate", () => {
  const source = developmentCases[0].input;
  const unmapped = evaluateRda({
    ...source,
    candidate: {
      ...source.candidate,
      effects: [{ ...source.candidate.effects[0], unitIds: [] }],
    },
  });
  assert.equal(unmapped.integrity.result, "consistent");
  assert.equal(unmapped.candidateResult, "indeterminate");
  assert.ok(unmapped.rulesApplied.includes("candidate-effect-unmapped"));

  const dangling = evaluateRda({
    ...source,
    candidate: {
      ...source.candidate,
      effects: [{ ...source.candidate.effects[0], unitIds: ["missing-unit"] }],
    },
  });
  assert.equal(dangling.candidateResult, "indeterminate");
  assert.ok(dangling.rulesApplied.includes("candidate-effect-unit-missing"));
});

test("mutates metadata that contradicts declared effects is incompatible", () => {
  const source = developmentCases[0].input;
  const report = evaluateRda({
    ...source,
    candidate: { ...source.candidate, mutates: false },
  });
  assert.equal(report.integrity.result, "consistent");
  assert.equal(report.candidateResult, "incompatible");
  assert.ok(report.rulesApplied.includes("candidate-mutates-effect-mismatch"));
});

test("negative units without explicit prohibited effects cannot pass by omission", () => {
  const source = developmentCases.find((item) => item.id === "S02-explicit-negation");
  assert.ok(source);
  const report = evaluateRda({
    ...source.input,
    sin: {
      ...source.input.sin,
      units: source.input.sin.units.map((unit) =>
        unit.id === "u1" ? { ...unit, prohibitedEffectKinds: [] } : unit
      ),
    },
  });
  assert.equal(report.units.find((unit) => unit.unitId === "u1")?.result, "indeterminate");
  assert.ok(report.rulesApplied.includes("negative-scope-incomplete"));
});

test("an exception without a verifiable scope remains indeterminate", () => {
  const source = developmentCases.find((item) => item.id === "S10-explicit-exception");
  assert.ok(source);
  const report = evaluateRda({
    ...source.input,
    sin: {
      ...source.input.sin,
      units: source.input.sin.units.map((unit) => ({
        ...unit,
        relations: unit.relations.map((relation) => ({
          kind: relation.kind,
          targetUnitId: relation.targetUnitId,
          evidence: relation.evidence,
        })),
      })),
    },
  });
  assert.equal(report.candidateResult, "indeterminate");
  assert.ok(report.rulesApplied.includes("exception-scope-missing"));
  assert.ok(!report.rulesApplied.includes("explicit-exception-vs-confirmation"));
});

test("context record IDs that conflict are never resolved by first match", () => {
  const proposalSource = developmentCases.find((item) => item.id === "adverse-no-pending-proposal");
  assert.ok(proposalSource);
  const proposalReport = evaluateRda({
    ...proposalSource.input,
    context: {
      ...proposalSource.input.context!,
      proposals: [
        { id: "P404", status: "pending" },
        { id: "P404", status: "absent" },
      ],
    },
  });
  assert.equal(proposalReport.integrity.result, "consistent");
  assert.equal(proposalReport.candidateResult, "indeterminate");
  assert.ok(!proposalReport.rulesApplied.includes("proposal-not-pending"));

  const resolutionSource = developmentCases.find((item) => item.id === "adverse-ambiguous-canonical-resolution");
  assert.ok(resolutionSource);
  const resolutionReport = evaluateRda({
    ...resolutionSource.input,
    context: {
      ...resolutionSource.input.context!,
      referenceResolutions: [
        { unitId: "u1", status: "resolved", targetKind: "proposal", targetRef: "P1" },
        { unitId: "u1", status: "resolved", targetKind: "reservation", targetRef: "R1" },
      ],
    },
  });
  assert.equal(resolutionReport.candidateResult, "indeterminate");
  assert.ok(!resolutionReport.rulesApplied.includes("candidate-target-mismatch"));

  const constraintSource = developmentCases.find((item) => item.id === "adverse-constraint-violated");
  assert.ok(constraintSource);
  const constraintReport = evaluateRda({
    ...constraintSource.input,
    context: {
      ...constraintSource.input.context!,
      constraints: [
        { id: "explicit-confirmation", status: "violated", source: "fixture:guard", evidence: "absent" },
        { id: "explicit-confirmation", status: "satisfied", source: "fixture:guard", evidence: "present" },
      ],
    },
  });
  assert.equal(constraintReport.candidateResult, "indeterminate");
  assert.ok(!constraintReport.rulesApplied.includes("canonical-constraint-violated"));
});

test("literal evidence failure affects integrity, not candidate compatibility", () => {
  const source = developmentCases.find((item) => item.id === "adverse-unsupported-evidence");
  assert.ok(source);
  const report = evaluateRda(source.input);
  assert.equal(report.integrity.result, "incompatible");
  assert.equal(report.candidateResult, "indeterminate");
  assert.equal(report.result, "incompatible");
});

test("no fixture or evaluator path refers to a production runtime dependency", () => {
  for (const item of developmentCases) {
    assert.equal("conv_state" in item.input, false);
  }
  const report = evaluateRda(developmentCases[0].input);
  assert.ok(report.limitations.some((value) => value.includes("No consulta runtime")));
  assert.ok(report.limitations.some((value) => value.includes("source, version y freshness son declaraciones")));
});

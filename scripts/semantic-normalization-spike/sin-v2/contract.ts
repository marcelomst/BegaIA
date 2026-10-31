// Path: scripts/semantic-normalization-spike/sin-v2/contract.ts

import { z } from "zod";

/**
 * Contrato experimental SIN V2 (offline). Representa interpretación lingüística
 * del mensaje del huésped. No contiene decisiones, efectos, targets ejecutables,
 * autorización ni estado canónico del runtime.
 */

export const COMMUNICATIVE_ACTS = [
  "instruct",
  "ask",
  "affirm",
  "reject",
  "correct",
  "retract",
  "qualify",
  "inform",
  "discourse",
] as const;
export const POLARITIES = ["positive", "negative", "neutral"] as const;
export const UNIT_STATUSES = ["interpreted", "partial", "abstained"] as const;
export const GLOBAL_STATUSES = ["complete", "partial", "abstained"] as const;
export const REFERENT_RESOLUTIONS = ["explicit", "ambiguous", "absent"] as const;
export const RELATION_TYPES = ["excepts", "corrects", "restricts", "qualifies", "contradicts"] as const;
export const DEPENDENCY_KINDS = ["antecedent", "prior_turn", "prior_state"] as const;
export const EVIDENCE_FIELDS = ["act", "predicate", "polarity", "referent", "relation", "dependency"] as const;
export const UNCERTAINTY_FIELDS = ["act", "predicate", "polarity", "referent", "relation", "dependency", "unit"] as const;

/** Claves que SIN nunca debe emitir; el validador las rechaza con un código propio. */
export const FORBIDDEN_KEYS = [
  "authorized",
  "authorization",
  "decision",
  "effect",
  "effects",
  "effectKind",
  "targetRef",
  "scopeKey",
  "scopeKeys",
  "material",
  "mutates",
  "prohibitedEffectKinds",
  "runtimeState",
  "confidence",
] as const;

const nonEmpty = z.string().trim().min(1);

const evidenceSchema = z.object({
  field: z.enum(EVIDENCE_FIELDS),
  span: nonEmpty,
}).strict();

const uncertaintySchema = z.object({
  field: z.enum(UNCERTAINTY_FIELDS),
  reason: nonEmpty,
}).strict();

const relationSchema = z.object({
  type: z.enum(RELATION_TYPES),
  targetUnitId: nonEmpty,
  scopeSurface: nonEmpty.optional(),
  evidence: nonEmpty,
}).strict();

const dependencySchema = z.object({
  kind: z.enum(DEPENDENCY_KINDS),
  evidence: nonEmpty,
}).strict();

const referentSchema = z.object({
  surface: nonEmpty.nullable(),
  resolution: z.enum(REFERENT_RESOLUTIONS),
}).strict();

export const sinV2UnitSchema = z.object({
  id: nonEmpty,
  status: z.enum(UNIT_STATUSES),
  act: z.enum(COMMUNICATIVE_ACTS),
  predicate: nonEmpty.nullable(),
  polarity: z.enum(POLARITIES),
  referent: referentSchema,
  relations: z.array(relationSchema),
  dependencies: z.array(dependencySchema),
  evidence: z.array(evidenceSchema),
  uncertainty: z.array(uncertaintySchema),
}).strict();

export const sinV2OutputSchema = z.object({
  schema: z.literal("sin-v2-experimental"),
  message: z.string(),
  status: z.enum(GLOBAL_STATUSES),
  units: z.array(sinV2UnitSchema),
  globalUncertainty: z.array(nonEmpty).optional(),
}).strict();

export type CommunicativeAct = (typeof COMMUNICATIVE_ACTS)[number];
export type SinV2Polarity = (typeof POLARITIES)[number];
export type SinV2UnitStatus = (typeof UNIT_STATUSES)[number];
export type SinV2GlobalStatus = (typeof GLOBAL_STATUSES)[number];
export type SinV2ReferentResolution = (typeof REFERENT_RESOLUTIONS)[number];
export type SinV2RelationType = (typeof RELATION_TYPES)[number];
export type SinV2DependencyKind = (typeof DEPENDENCY_KINDS)[number];
export type SinV2Unit = z.infer<typeof sinV2UnitSchema>;
export type SinV2Output = z.infer<typeof sinV2OutputSchema>;
export type SinV2Relation = SinV2Unit["relations"][number];
export type SinV2Dependency = SinV2Unit["dependencies"][number];

// Path: scripts/semantic-normalization-spike/sin-v2-evaluation/runner.ts

import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { SinV2Output } from "../sin-v2/contract";
import { validateSinV2, type ValidationIssue } from "../sin-v2/validator";
import {
  createSimulatedTransport,
  createApprovedOutputFormat,
  getApprovedVersion,
  isSimulatedTransport,
  OllamaWindowsClient,
  PROMPT_VERSIONS,
  readApprovedArtifacts,
  unknownModelMetadata,
  type EvaluationTransport,
  type OutputMode,
  type PromptVersion,
  type RuntimeVariant,
  type HttpRequestCapture,
  type HttpResponseCapture,
  type ModelMetadata,
  type TransportDuration,
  type TransportResult,
} from "./transport";

export interface EvaluationCase {
  id: string;
  message: string;
}

export interface TransportConfiguration {
  method: "POST";
  url: string;
  headers: Record<string, string>;
  stream: false;
}

export interface ModelConfiguration {
  identifier: string;
  status: "simulated_only" | "configured_unverified";
}

export interface GenerationConfiguration {
  think: false;
  options: {
    temperature: number;
    seed: number;
    num_ctx: number;
    num_predict: number;
    top_p: number;
    top_k: number;
  };
}

export interface OllamaConfiguration {
  endpoint: string;
  timeout_ms: number;
  expected_version: string;
  model: {
    identifier: string;
    expected_digest: string;
  };
  generation: GenerationConfiguration;
}

export interface ArtifactHashes {
  prompt_sha256: string;
  contract_sha256: string;
  validator_sha256: string;
}

export interface EvaluationManifest {
  experiment_id: string;
  status: "development_draft";
  execution_mode: "simulated_only";
  prompt_path: "prompt.txt" | "prompt.v2.txt";
  output_mode?: "schema_constrained" | "conditional_schema";
  schema_sha256?: string;
  transport_configuration: TransportConfiguration;
  model_configuration: ModelConfiguration | null;
  ollama_configuration: OllamaConfiguration;
  artifact_hashes: ArtifactHashes;
  model_metadata: ModelMetadata;
  cases: EvaluationCase[];
}

export type ResultClassification =
  | "valid"
  | "transport_error"
  | "timeout"
  | "http_error"
  | "outer_json_invalid"
  | "sin_json_invalid"
  | "schema_invalid"
  | "truncated";

export interface GenerationMetadata {
  source: "not_available" | "simulated" | "observed";
  model: unknown | null;
  created_at: unknown | null;
  done: unknown | null;
  done_reason: unknown | null;
  prompt_eval_count: unknown | null;
  eval_count: unknown | null;
  total_duration: unknown | null;
  load_duration: unknown | null;
  prompt_eval_duration: unknown | null;
  eval_duration: unknown | null;
  available_fields: string[];
}

export interface EvaluationRecord {
  execution_id: string;
  experiment_id: string;
  case_id: string;
  prompt_sha256: string;
  manifest_sha256: string;
  message: string;
  request_http: HttpRequestCapture;
  transport_outcome: TransportResult["kind"];
  transport_error_code: string | null;
  http_response: HttpResponseCapture | null;
  raw_outer_response_text: string | null;
  sin_content_text: string | null;
  duration: TransportDuration;
  generation_metadata: GenerationMetadata;
  model_metadata: ModelMetadata;
  classification: ResultClassification;
  validation_issues: ValidationIssue[];
  validated_output: SinV2Output | null;
}

export interface EvaluationReport {
  execution_id: string;
  experiment_id: string;
  status: "development_draft";
  execution_mode: "simulated_only" | "ollama_windows";
  output_mode?: "schema_constrained" | "conditional_schema";
  provenance: {
    prompt_sha256: string;
    manifest_sha256: string;
    schema_sha256?: string;
    artifacts: {
      contract_sha256: string;
      validator_sha256: string;
    };
    reproducibility: {
      status: "incomplete";
      reasons: string[];
    };
  };
  declared_configuration: {
    transport: TransportConfiguration;
    model: ModelConfiguration | null;
    ollama: OllamaConfiguration;
    model_metadata: ModelMetadata;
  };
  preflight_model_metadata: ModelMetadata;
  bridge_origin: "not_applicable" | "powershell" | "injected";
  results: EvaluationRecord[];
}

export interface RunOptions {
  executionId?: string;
  manifestSha256: string;
  // eslint-disable-next-line no-unused-vars
  sink?: (record: EvaluationRecord) => void;
}

export interface OllamaRunOptions extends RunOptions {
  authorizeRealInference?: boolean;
  promptVersion?: PromptVersion;
  outputMode?: OutputMode;
  runtimeVariant?: RuntimeVariant;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isUnknownMetadata(value: unknown): value is ModelMetadata {
  return isRecord(value)
    && hasExactKeys(value, ["status", "provider", "model", "version", "digest"])
    && value.status === "unknown"
    && value.provider === null
    && value.model === null
    && value.version === null
    && value.digest === null;
}

function parseTransportConfiguration(value: unknown): TransportConfiguration | null {
  if (!isRecord(value)
    || !hasExactKeys(value, ["method", "url", "headers", "stream"])
    || value.method !== "POST"
    || typeof value.url !== "string"
    || value.url.length === 0
    || value.stream !== false
    || !isRecord(value.headers)
    || !hasExactKeys(value.headers, ["content-type"])
    || value.headers["content-type"] !== "application/json") {
    return null;
  }
  return {
    method: "POST",
    url: value.url,
    headers: { "content-type": "application/json" },
    stream: false,
  };
}

function parseModelConfiguration(value: unknown): ModelConfiguration | null {
  if (value === null) return null;
  if (!isRecord(value)
    || !hasExactKeys(value, ["identifier", "status"])
    || typeof value.identifier !== "string"
    || value.identifier.trim().length === 0
    || (value.status !== "simulated_only" && value.status !== "configured_unverified")) {
    throw new Error("Manifest model configuration is invalid.");
  }
  return {
    identifier: value.identifier,
    status: value.status,
  };
}

function parseOllamaConfiguration(value: unknown): OllamaConfiguration {
  if (!isRecord(value)
    || !hasExactKeys(value, ["endpoint", "timeout_ms", "expected_version", "model", "generation"])
    || value.endpoint !== "http://127.0.0.1:11434/api/chat"
    || !Number.isInteger(value.timeout_ms)
    || (value.timeout_ms as number) < 1
    || (value.timeout_ms as number) > 180_000
    || (value.expected_version !== "0.40.14" && value.expected_version !== "0.40.15")
    || !isRecord(value.model)
    || !hasExactKeys(value.model, ["identifier", "expected_digest"])
    || typeof value.model.identifier !== "string"
    || value.model.identifier.trim().length === 0
    || typeof value.model.expected_digest !== "string"
    || !/^[a-f0-9]{64}$/i.test(value.model.expected_digest)
    || !isRecord(value.generation)
    || !hasExactKeys(value.generation, ["think", "options"])
    || value.generation.think !== false
    || !isRecord(value.generation.options)
    || !hasExactKeys(value.generation.options, [
      "temperature",
      "seed",
      "num_ctx",
      "num_predict",
      "top_p",
      "top_k",
    ])) {
    throw new Error("Manifest Ollama configuration is invalid.");
  }
  const options = value.generation.options;
  if (typeof options.temperature !== "number"
    || options.temperature < 0
    || !Number.isInteger(options.seed)
    || !Number.isInteger(options.num_ctx)
    || (options.num_ctx as number) < 1
    || !Number.isInteger(options.num_predict)
    || (options.num_predict as number) < 1
    || typeof options.top_p !== "number"
    || options.top_p <= 0
    || options.top_p > 1
    || !Number.isInteger(options.top_k)
    || (options.top_k as number) < 1) {
    throw new Error("Manifest Ollama generation settings are invalid.");
  }
  return {
    endpoint: value.endpoint,
    timeout_ms: value.timeout_ms as number,
    expected_version: value.expected_version,
    model: {
      identifier: value.model.identifier,
      expected_digest: value.model.expected_digest,
    },
    generation: {
      think: false,
      options: {
        temperature: options.temperature,
        seed: options.seed as number,
        num_ctx: options.num_ctx as number,
        num_predict: options.num_predict as number,
        top_p: options.top_p,
        top_k: options.top_k as number,
      },
    },
  };
}

function parseArtifactHashes(value: unknown): ArtifactHashes {
  if (!isRecord(value)
    || !hasExactKeys(value, ["prompt_sha256", "contract_sha256", "validator_sha256"])
    || Object.values(value).some((hash) => typeof hash !== "string" || !/^[a-f0-9]{64}$/i.test(hash))) {
    throw new Error("Manifest artifact hashes are invalid.");
  }
  return {
    prompt_sha256: value.prompt_sha256 as string,
    contract_sha256: value.contract_sha256 as string,
    validator_sha256: value.validator_sha256 as string,
  };
}

function parseManifest(value: unknown): EvaluationManifest {
  const baseKeys = [
    "experiment_id",
    "status",
    "execution_mode",
    "prompt_path",
    "transport_configuration",
    "model_configuration",
    "ollama_configuration",
    "artifact_hashes",
    "model_metadata",
    "cases",
  ];
  const constrained = isRecord(value) && Object.hasOwn(value, "output_mode");
  if (!isRecord(value)
    || !hasExactKeys(value, constrained ? [...baseKeys, "output_mode", "schema_sha256"] : baseKeys)
    || (constrained && ((value.output_mode !== "schema_constrained" && value.output_mode !== "conditional_schema")
      || typeof value.schema_sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(value.schema_sha256)))
    || typeof value.experiment_id !== "string"
    || value.experiment_id.length === 0
    || value.status !== "development_draft"
    || value.execution_mode !== "simulated_only"
    || (value.prompt_path !== "prompt.txt" && value.prompt_path !== "prompt.v2.txt")
    || !isUnknownMetadata(value.model_metadata)
    || !Array.isArray(value.cases)) {
    throw new Error("Manifest is not a strict simulated development_draft manifest.");
  }

  const transportConfiguration = parseTransportConfiguration(value.transport_configuration);
  if (transportConfiguration === null) {
    throw new Error("Manifest transport configuration is invalid.");
  }
  const modelConfiguration = parseModelConfiguration(value.model_configuration);
  const ollamaConfiguration = parseOllamaConfiguration(value.ollama_configuration);
  const artifactHashes = parseArtifactHashes(value.artifact_hashes);

  const cases: EvaluationCase[] = value.cases.map((item, index) => {
    if (!isRecord(item)
      || !hasExactKeys(item, ["id", "message"])
      || typeof item.id !== "string"
      || item.id.length === 0
      || typeof item.message !== "string") {
      throw new Error(`Manifest case at index ${index} must contain only a non-empty id and message.`);
    }
    return { id: item.id, message: item.message };
  });

  return {
    experiment_id: value.experiment_id,
    status: "development_draft",
    execution_mode: "simulated_only",
    prompt_path: value.prompt_path,
    ...(constrained
      ? { output_mode: value.output_mode as "schema_constrained" | "conditional_schema", schema_sha256: value.schema_sha256 as string }
      : {}),
    transport_configuration: transportConfiguration,
    model_configuration: modelConfiguration,
    ollama_configuration: ollamaConfiguration,
    artifact_hashes: artifactHashes,
    model_metadata: value.model_metadata,
    cases,
  };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function buildHttpRequest(
  evaluationCase: EvaluationCase,
  prompt: string,
  configuration: TransportConfiguration,
  modelConfiguration: ModelConfiguration | null,
  ollamaConfiguration?: OllamaConfiguration,
  outputFormat?: Record<string, unknown>,
): HttpRequestCapture {
  const effectiveModelConfiguration = ollamaConfiguration
    ? { identifier: ollamaConfiguration.model.identifier }
    : modelConfiguration;
  if (!effectiveModelConfiguration || effectiveModelConfiguration.identifier.trim().length === 0) {
    throw new Error("A declared model identifier is required before building an HTTP request.");
  }
  const bodyText = JSON.stringify({
    model: effectiveModelConfiguration.identifier,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: evaluationCase.message },
    ],
    stream: configuration.stream,
    ...(ollamaConfiguration
      ? {
          think: ollamaConfiguration.generation.think,
          options: ollamaConfiguration.generation.options,
          ...(outputFormat ? { format: outputFormat } : {}),
        }
      : {}),
  });
  return {
    method: configuration.method,
    url: ollamaConfiguration?.endpoint ?? configuration.url,
    headers: { ...configuration.headers },
    bodyText,
  };
}

function emptyGenerationMetadata(
  source: GenerationMetadata["source"] = "not_available",
): GenerationMetadata {
  return {
    source,
    model: null,
    created_at: null,
    done: null,
    done_reason: null,
    prompt_eval_count: null,
    eval_count: null,
    total_duration: null,
    load_duration: null,
    prompt_eval_duration: null,
    eval_duration: null,
    available_fields: [],
  };
}

function getGenerationMetadata(
  value: unknown,
  source: Exclude<GenerationMetadata["source"], "not_available">,
): GenerationMetadata {
  if (!isRecord(value)) return emptyGenerationMetadata(source);
  const keys = [
    "model",
    "created_at",
    "done",
    "done_reason",
    "prompt_eval_count",
    "eval_count",
    "total_duration",
    "load_duration",
    "prompt_eval_duration",
    "eval_duration",
  ] as const;
  const availableFields = keys.filter((key) => Object.hasOwn(value, key));
  return {
    source,
    model: Object.hasOwn(value, "model") ? value.model : null,
    created_at: Object.hasOwn(value, "created_at") ? value.created_at : null,
    done: Object.hasOwn(value, "done") ? value.done : null,
    done_reason: Object.hasOwn(value, "done_reason") ? value.done_reason : null,
    prompt_eval_count: Object.hasOwn(value, "prompt_eval_count") ? value.prompt_eval_count : null,
    eval_count: Object.hasOwn(value, "eval_count") ? value.eval_count : null,
    total_duration: Object.hasOwn(value, "total_duration") ? value.total_duration : null,
    load_duration: Object.hasOwn(value, "load_duration") ? value.load_duration : null,
    prompt_eval_duration: Object.hasOwn(value, "prompt_eval_duration") ? value.prompt_eval_duration : null,
    eval_duration: Object.hasOwn(value, "eval_duration") ? value.eval_duration : null,
    available_fields: availableFields,
  };
}

function createProvenance(
  manifest: EvaluationManifest,
  prompt: string,
  manifestSha256: string,
): EvaluationReport["provenance"] {
  const contractText = readFileSync(new URL("../sin-v2/contract.ts", import.meta.url));
  const validatorText = readFileSync(new URL("../sin-v2/validator.ts", import.meta.url));
  return {
    prompt_sha256: sha256(prompt),
    manifest_sha256: manifestSha256,
    ...(manifest.output_mode !== undefined ? { schema_sha256: manifest.schema_sha256 } : {}),
    artifacts: {
      contract_sha256: sha256(contractText),
      validator_sha256: sha256(validatorText),
    },
    reproducibility: {
      status: "incomplete",
      reasons: [
        "model_digest_unknown",
        "generation_digest_not_attested_by_chat_response",
        "effective_runtime_and_hardware_not_bound_to_generation",
      ],
    },
  };
}

async function evaluateCaseCore(
  evaluationCase: EvaluationCase,
  prompt: string,
  transport: EvaluationTransport,
  manifest: EvaluationManifest,
  executionId: string,
  manifestSha256: string,
  ollamaConfiguration?: OllamaConfiguration,
): Promise<EvaluationRecord> {
  const request = buildHttpRequest(
    evaluationCase,
    prompt,
    manifest.transport_configuration,
    manifest.model_configuration,
    ollamaConfiguration,
    ollamaConfiguration && manifest.output_mode !== undefined
      ? createApprovedOutputFormat(manifest.schema_sha256, manifest.output_mode)
      : undefined,
  );
  const transportResult = await transport(request);
  const responseCapture = transportResult.kind === "response" ? transportResult.response : null;
  const base: EvaluationRecord = {
    execution_id: executionId,
    experiment_id: manifest.experiment_id,
    case_id: evaluationCase.id,
    prompt_sha256: sha256(prompt),
    manifest_sha256: manifestSha256,
    message: evaluationCase.message,
    request_http: request,
    transport_outcome: transportResult.kind,
    transport_error_code: transportResult.kind === "response" ? null : transportResult.errorCode,
    http_response: responseCapture,
    raw_outer_response_text: responseCapture?.bodyText ?? null,
    sin_content_text: null,
    duration: transportResult.duration,
    generation_metadata: emptyGenerationMetadata(),
    model_metadata: transportResult.modelMetadata,
    classification: "outer_json_invalid",
    validation_issues: [],
    validated_output: null,
  };

  if (transportResult.kind !== "response") {
    return { ...base, classification: transportResult.kind };
  }
  const response = transportResult.response;
  if (response.status < 200 || response.status >= 300) {
    return { ...base, classification: "http_error" };
  }

  let outerEnvelope: unknown;
  try {
    outerEnvelope = JSON.parse(response.bodyText);
  } catch (error: unknown) {
    if (!(error instanceof SyntaxError)) throw error;
    return { ...base, classification: "outer_json_invalid" };
  }

  const generationMetadata = getGenerationMetadata(outerEnvelope, transportResult.duration.source);
  if (!isRecord(outerEnvelope)) {
    return { ...base, generation_metadata: generationMetadata, classification: "outer_json_invalid" };
  }

  const envelopeIssues: ValidationIssue[] = [];
  const message = outerEnvelope.message;
  const sinContentText = isRecord(message) && typeof message.content === "string"
    ? message.content
    : null;
  if (!isRecord(message)) {
    envelopeIssues.push({
      code: "outer-envelope-message-invalid",
      detail: "La respuesta exterior no contiene un objeto message.",
    });
  } else if (sinContentText === null) {
    envelopeIssues.push({
      code: "outer-envelope-content-invalid",
      detail: "La respuesta exterior no contiene message.content como cadena.",
    });
  }

  const explicitlyTruncated = outerEnvelope.done === false || outerEnvelope.done_reason === "length";
  if (explicitlyTruncated) {
    return {
      ...base,
      generation_metadata: generationMetadata,
      classification: "truncated",
      validation_issues: envelopeIssues,
    };
  }
  if (sinContentText === null) {
    return {
      ...base,
      generation_metadata: generationMetadata,
      classification: "outer_json_invalid",
      validation_issues: envelopeIssues,
    };
  }

  const contentBase = {
    ...base,
    generation_metadata: generationMetadata,
    sin_content_text: sinContentText,
  };
  if (outerEnvelope.done === false || outerEnvelope.done_reason === "length") {
    return { ...contentBase, classification: "truncated" };
  }

  let parsedSin: unknown;
  try {
    parsedSin = JSON.parse(sinContentText);
  } catch (error: unknown) {
    if (!(error instanceof SyntaxError)) throw error;
    return { ...contentBase, classification: "sin_json_invalid" };
  }

  const validation = validateSinV2(parsedSin);
  if (!validation.valid) {
    return {
      ...contentBase,
      classification: "schema_invalid",
      validation_issues: validation.issues,
    };
  }
  return {
    ...contentBase,
    classification: "valid",
    validated_output: validation.output,
  };
}

export async function evaluateCase(
  evaluationCase: EvaluationCase,
  prompt: string,
  transport: EvaluationTransport,
  manifest: EvaluationManifest,
  executionId: string,
  manifestSha256: string,
): Promise<EvaluationRecord> {
  if (!isSimulatedTransport(transport)) {
    throw new Error("Only registered simulated transports are accepted; real inference requires runOllamaEvaluation.");
  }
  return evaluateCaseCore(
    evaluationCase,
    prompt,
    transport,
    manifest,
    executionId,
    manifestSha256,
  );
}

export async function runEvaluation(
  manifest: EvaluationManifest,
  prompt: string,
  transport: EvaluationTransport,
  options: RunOptions,
): Promise<EvaluationReport> {
  if (!isSimulatedTransport(transport)) {
    throw new Error("Only registered simulated transports are accepted; real inference requires runOllamaEvaluation.");
  }
  return runEvaluationCore(manifest, prompt, transport, options, "simulated_only", unknownModelMetadata);
}

async function runEvaluationCore(
  manifest: EvaluationManifest,
  prompt: string,
  transport: EvaluationTransport,
  options: RunOptions,
  executionMode: EvaluationReport["execution_mode"],
  preflightModelMetadata: ModelMetadata,
  bridgeOrigin: EvaluationReport["bridge_origin"] = "not_applicable",
): Promise<EvaluationReport> {
  if (!options
    || typeof options.manifestSha256 !== "string"
    || !/^[a-f0-9]{64}$/i.test(options.manifestSha256)) {
    throw new Error("A valid manifestSha256 from the loaded manifest bytes is required.");
  }
  const executionId = options.executionId ?? randomUUID();
  const manifestSha256 = options.manifestSha256;
  const results: EvaluationRecord[] = [];
  for (const evaluationCase of manifest.cases) {
    const requestConfiguration = executionMode === "ollama_windows"
      ? { ...manifest.transport_configuration, url: manifest.ollama_configuration.endpoint }
      : manifest.transport_configuration;
    const record = await evaluateCaseCore(
      evaluationCase,
      prompt,
      transport,
      {
        ...manifest,
        transport_configuration: requestConfiguration,
        model_configuration: executionMode === "ollama_windows"
          ? {
              identifier: manifest.ollama_configuration.model.identifier,
              status: "configured_unverified",
            }
          : manifest.model_configuration,
      },
      executionId,
      manifestSha256,
      executionMode === "ollama_windows" ? manifest.ollama_configuration : undefined,
    );
    results.push(record);
    options.sink?.(record);
  }
  return {
    execution_id: executionId,
    experiment_id: manifest.experiment_id,
    status: manifest.status,
    execution_mode: executionMode,
    ...(manifest.output_mode !== undefined ? { output_mode: manifest.output_mode } : {}),
    provenance: createProvenance(manifest, prompt, manifestSha256),
    declared_configuration: {
      transport: manifest.transport_configuration,
      model: manifest.model_configuration,
      ollama: manifest.ollama_configuration,
      model_metadata: manifest.model_metadata,
    },
    preflight_model_metadata: preflightModelMetadata,
    bridge_origin: bridgeOrigin,
    results,
  };
}

function verifyOllamaExecutionInputs(
  manifest: EvaluationManifest,
  prompt: string,
  manifestSha256: string,
  promptVersion: PromptVersion,
  outputMode: OutputMode = "prompt_only",
  runtimeVariant?: RuntimeVariant,
): void {
  const approved = getApprovedVersion(promptVersion, outputMode, runtimeVariant);
  if (manifest.cases.length !== 1
    || manifest.cases[0].id !== approved.case.id
    || manifest.cases[0].message !== approved.case.message) {
    throw new Error("Ollama execution requires the single authorized synthetic development case.");
  }
  if (manifest.experiment_id !== approved.experimentId || manifest.prompt_path !== approved.promptFile) {
    throw new Error("The manifest identity or prompt path does not match the approved prompt version.");
  }
  if (approved.outputMode !== "prompt_only"
    ? manifest.output_mode !== approved.outputMode || manifest.schema_sha256 !== approved.schemaSha256
    : manifest.output_mode !== undefined || manifest.schema_sha256 !== undefined) {
    throw new Error("The manifest output mode or schema hash does not match the approved profile.");
  }
  if (manifest.ollama_configuration.model.identifier !== approved.profile.model.identifier
    || manifest.ollama_configuration.model.expected_digest.toLowerCase() !== approved.profile.model.expected_digest
    || manifest.ollama_configuration.endpoint !== approved.profile.endpoint
    || manifest.ollama_configuration.timeout_ms !== approved.profile.timeout_ms
    || manifest.ollama_configuration.expected_version !== approved.profile.expected_version
    || JSON.stringify(manifest.ollama_configuration.generation) !== JSON.stringify(approved.profile.generation)) {
    throw new Error("Ollama model or generation configuration does not match the approved profile.");
  }
  const { manifestBytes, promptBytes } = readApprovedArtifacts(promptVersion, outputMode, runtimeVariant);
  if (sha256(manifestBytes) !== manifestSha256) {
    throw new Error("manifestSha256 does not match the effective manifest bytes.");
  }
  const sourceManifest = parseManifest(JSON.parse(manifestBytes.toString("utf8")));
  if (JSON.stringify(sourceManifest) !== JSON.stringify(manifest)) {
    throw new Error("The in-memory manifest differs from the effective manifest file.");
  }
  const contractBytes = readFileSync(new URL("../sin-v2/contract.ts", import.meta.url));
  const validatorBytes = readFileSync(new URL("../sin-v2/validator.ts", import.meta.url));
  const actualHashes = {
    prompt_sha256: sha256(promptBytes),
    contract_sha256: sha256(contractBytes),
    validator_sha256: sha256(validatorBytes),
  };
  if (sha256(prompt) !== actualHashes.prompt_sha256
    || JSON.stringify(actualHashes) !== JSON.stringify(manifest.artifact_hashes)) {
    throw new Error("Prompt, contract, or validator integrity check failed.");
  }
}

export async function runOllamaEvaluation(
  manifest: EvaluationManifest,
  prompt: string,
  client: OllamaWindowsClient,
  options: OllamaRunOptions,
): Promise<EvaluationReport> {
  if (options?.authorizeRealInference !== true) {
    throw new Error("Explicit real-inference authorization is required.");
  }
  if (!OllamaWindowsClient.isGenuine(client)) {
    throw new Error("A client created by createOllamaWindowsClient is required.");
  }
  if (client.timeoutMs !== manifest.ollama_configuration.timeout_ms) {
    throw new Error("Ollama transport timeout differs from the frozen manifest configuration.");
  }
  if (!options
    || typeof options.manifestSha256 !== "string"
    || !/^[a-f0-9]{64}$/i.test(options.manifestSha256)) {
    throw new Error("A valid manifestSha256 from the loaded manifest bytes is required.");
  }
  const promptVersion = options.promptVersion ?? "v1";
  const outputMode = options.outputMode ?? "prompt_only";
  getApprovedVersion(promptVersion, outputMode, options.runtimeVariant);
  verifyOllamaExecutionInputs(manifest, prompt, options.manifestSha256, promptVersion, outputMode, options.runtimeVariant);

  return client.runVerified(
    {
      authorizeRealInference: true,
      promptVersion,
      outputMode,
      runtimeVariant: options.runtimeVariant,
      configuration: manifest.ollama_configuration,
      prompt,
      caseId: manifest.cases[0].id,
      caseMessage: manifest.cases[0].message,
      manifestSha256: options.manifestSha256,
    },
    (transport, preflightMetadata) => runEvaluationCore(
      manifest,
      prompt,
      transport,
      options,
      "ollama_windows",
      preflightMetadata,
      client.bridgeOrigin,
    ),
  );
}

export function loadManifestAndPrompt(
  version: PromptVersion = "v1",
  outputMode: OutputMode = "prompt_only",
  runtimeVariant?: RuntimeVariant,
): {
  manifest: EvaluationManifest;
  prompt: string;
  manifestSha256: string;
} {
  const { approved, manifestBytes, promptBytes } = readApprovedArtifacts(version, outputMode, runtimeVariant);
  const manifest = parseManifest(JSON.parse(manifestBytes.toString("utf8")));
  if (manifest.experiment_id !== approved.experimentId || manifest.prompt_path !== approved.promptFile) {
    throw new Error("The manifest identity or prompt path does not match the approved prompt version.");
  }
  if (approved.outputMode !== "prompt_only"
    ? manifest.output_mode !== approved.outputMode || manifest.schema_sha256 !== approved.schemaSha256
    : manifest.output_mode !== undefined || manifest.schema_sha256 !== undefined) {
    throw new Error("The manifest output mode or schema hash does not match the approved profile.");
  }
  const contractBytes = readFileSync(new URL("../sin-v2/contract.ts", import.meta.url));
  const validatorBytes = readFileSync(new URL("../sin-v2/validator.ts", import.meta.url));
  const prompt = promptBytes.toString("utf8");
  if (sha256(promptBytes) !== manifest.artifact_hashes.prompt_sha256
    || sha256(contractBytes) !== manifest.artifact_hashes.contract_sha256
    || sha256(validatorBytes) !== manifest.artifact_hashes.validator_sha256) {
    throw new Error("Prompt, contract, or validator does not match the manifest's frozen hashes.");
  }
  return { manifest, prompt, manifestSha256: sha256(manifestBytes) };
}

export type CliSelection =
  | { mode: "simulated" }
  | { mode: "ollama-windows"; promptVersion: PromptVersion; outputMode?: "schema_constrained" | "conditional_schema"; runtimeVariant?: RuntimeVariant };

const REAL_INFERENCE_FLAGS = ["--mode=ollama-windows", "--authorize-real-inference"];

// Closed grammar: authorization flags and only the explicitly approved selectors; never paths.
export function parseCliArguments(args: readonly string[]): CliSelection {
  if (args.length === 0) return { mode: "simulated" };
  const versionArgs = args.filter((arg) => arg.startsWith("--prompt-version="));
  const modeArgs = args.filter((arg) => arg.startsWith("--output-mode="));
  const variantArgs = args.filter((arg) => arg.startsWith("--runtime-variant="));
  const rest = args.filter((arg) => !arg.startsWith("--prompt-version=")
    && !arg.startsWith("--output-mode=") && !arg.startsWith("--runtime-variant="));
  const flagsValid = rest.length === 2 && REAL_INFERENCE_FLAGS.every((flag) => rest.includes(flag));
  if (!flagsValid
    || versionArgs.length > 1
    || modeArgs.length > 1
    || variantArgs.length > 1
    || args.length !== rest.length + versionArgs.length + modeArgs.length + variantArgs.length) {
    throw new Error("Real inference requires both --mode=ollama-windows and --authorize-real-inference.");
  }
  const requestedVersion = versionArgs.length === 0
    ? "v1"
    : versionArgs[0].slice("--prompt-version=".length);
  const promptVersion = PROMPT_VERSIONS.find((version) => version === requestedVersion);
  if (promptVersion === undefined) {
    throw new Error("Unknown or unapproved prompt version.");
  }
  if (variantArgs.length > 0
    && (variantArgs[0] !== "--runtime-variant=b4-015"
      || versionArgs.length !== 1 || promptVersion !== "v2"
      || modeArgs.length !== 1 || modeArgs[0] !== "--output-mode=conditional-schema")) {
    throw new Error("Unknown or unapproved runtime variant combination.");
  }
  if (modeArgs.length === 0) return { mode: "ollama-windows", promptVersion };
  if (modeArgs[0] !== "--output-mode=schema-constrained"
    && modeArgs[0] !== "--output-mode=conditional-schema") {
    throw new Error("Unknown or unapproved output mode.");
  }
  if (versionArgs.length === 0 || promptVersion !== "v2") {
    throw new Error(modeArgs[0] === "--output-mode=schema-constrained"
      ? "schema-constrained output requires an explicit --prompt-version=v2."
      : "conditional-schema output requires an explicit --prompt-version=v2.");
  }
  return {
    mode: "ollama-windows",
    promptVersion,
    outputMode: modeArgs[0] === "--output-mode=conditional-schema" ? "conditional_schema" : "schema_constrained",
    ...(variantArgs.length > 0 ? { runtimeVariant: "b4-015" as const } : {}),
  };
}

async function main(): Promise<void> {
  const selection = parseCliArguments(process.argv.slice(2));
  if (selection.mode === "simulated") {
    const { manifest, prompt, manifestSha256 } = loadManifestAndPrompt();
    const report = await runEvaluation(manifest, prompt, createSimulatedTransport(), { manifestSha256 });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const { manifest, prompt, manifestSha256 } = loadManifestAndPrompt(
    selection.promptVersion,
    selection.outputMode ?? "prompt_only",
    selection.runtimeVariant,
  );
  const { createOllamaWindowsClient } = await import("./transport");
  const client = createOllamaWindowsClient(manifest.ollama_configuration.timeout_ms);
  const report = await runOllamaEvaluation(manifest, prompt, client, {
    manifestSha256,
    authorizeRealInference: true,
    promptVersion: selection.promptVersion,
    outputMode: selection.outputMode ?? "prompt_only",
    runtimeVariant: selection.runtimeVariant,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const invokedPath = process.argv[1];
if (invokedPath && pathToFileURL(resolve(invokedPath)).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error("SIN V2 evaluation failed:", error);
    process.exitCode = 1;
  });
}

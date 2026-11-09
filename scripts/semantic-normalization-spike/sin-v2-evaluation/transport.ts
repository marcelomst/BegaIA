// Path: scripts/semantic-normalization-spike/sin-v2-evaluation/transport.ts

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { z } from "zod";

import { sinV2OutputSchema } from "../sin-v2/contract";

export interface ModelMetadata {
  status: "unknown" | "observed";
  provider: string | null;
  model: string | null;
  version: string | null;
  digest: string | null;
}

export interface HttpRequestCapture {
  method: "POST";
  url: string;
  headers: Record<string, string>;
  bodyText: string;
}

export interface HttpResponseCapture {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
  bodyBase64?: string;
}

export interface TransportDuration {
  milliseconds: number;
  source: "simulated" | "observed";
}

export type TransportRequest = HttpRequestCapture;

export type TransportResult =
  | {
      kind: "response";
      response: HttpResponseCapture;
      duration: TransportDuration;
      modelMetadata: ModelMetadata;
    }
  | {
      kind: "transport_error" | "timeout";
      response: null;
      errorCode: string;
      duration: TransportDuration;
      modelMetadata: ModelMetadata;
    };

// The request name is retained for the transport contract's function signature.
// eslint-disable-next-line no-unused-vars
export type EvaluationTransport = (request: TransportRequest) => Promise<TransportResult>;

export const unknownModelMetadata: ModelMetadata = {
  status: "unknown",
  provider: null,
  model: null,
  version: null,
  digest: null,
};

export type SimulatedTransportScenario = (
  | {
      kind: "response";
      status?: number;
      headers?: Record<string, string>;
      bodyText?: string;
      durationMilliseconds?: number;
    }
  | {
      kind: "transport_error";
      errorCode: string;
      durationMilliseconds?: number;
    }
  | {
      kind: "timeout";
      errorCode: string;
      durationMilliseconds?: number;
    }
) & {
  // eslint-disable-next-line no-unused-vars
  onInvoke?: (request: TransportRequest) => void;
};

export interface OllamaBridgeRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  bodyBase64: string | null;
  timeoutMs: number;
}

export type OllamaBridgeResult =
  | {
      kind: "response";
      status: number;
      headers: Record<string, string>;
      bodyBase64: string;
      durationMilliseconds: number;
    }
  | {
      kind: "transport_error" | "timeout";
      errorCode: string;
      durationMilliseconds: number;
    };

// The bridge receives structured data through stdin; its implementation does not interpolate request data into PowerShell.
// eslint-disable-next-line no-unused-vars
export type OllamaBridge = (request: OllamaBridgeRequest) => Promise<unknown>;

export interface OllamaWindowsConfiguration {
  endpoint: string;
  timeout_ms: number;
  expected_version: string;
  model: {
    identifier: string;
    expected_digest: string;
  };
  generation: {
    think: boolean;
    options: Record<string, number>;
  };
}

const MAX_TIMEOUT_MS = 180_000;
const MAX_BRIDGE_OUTPUT_BYTES = 8 * 1024 * 1024;
const APPROVED_HOST = "127.0.0.1";
const APPROVED_PORT = "11434";
const simulatedTransports = new WeakSet<EvaluationTransport>();
const clientConstructionToken = Symbol("ollama-windows-client-construction");

export function isSimulatedTransport(transport: unknown): transport is EvaluationTransport {
  return typeof transport === "function" && simulatedTransports.has(transport as EvaluationTransport);
}

export const PROMPT_VERSIONS = ["v1", "v2"] as const;
export type PromptVersion = (typeof PROMPT_VERSIONS)[number];

export const OUTPUT_MODES = ["prompt_only", "schema_constrained", "conditional_schema"] as const;
export type OutputMode = (typeof OUTPUT_MODES)[number];
export type RuntimeVariant = "b4-015";

export interface ApprovedVersion {
  readonly version: PromptVersion;
  readonly outputMode: OutputMode;
  readonly schemaSha256: string | null;
  readonly experimentId: string;
  readonly manifestFile: string;
  readonly promptFile: string;
  readonly manifestSha256: string;
  readonly promptSha256: string;
  readonly case: { readonly id: string; readonly message: string };
  readonly profile: OllamaWindowsConfiguration;
}

export interface OllamaExecutionPlan {
  authorizeRealInference: true;
  promptVersion?: PromptVersion;
  outputMode?: OutputMode;
  runtimeVariant?: RuntimeVariant;
  configuration: OllamaWindowsConfiguration;
  prompt: string;
  caseId: string;
  caseMessage: string;
  manifestSha256: string;
}

const APPROVED_MODEL = "qwen3.5:4b-q4_K_M";
const APPROVED_DIGEST = "d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04";
const APPROVED_CASE = { id: "synthetic-smoke-01", message: "¿Me contás qué opciones hay?" };
const APPROVED_PROFILE = {
  endpoint: "http://127.0.0.1:11434/api/chat",
  timeout_ms: 180_000,
  expected_version: "0.40.14",
  model: { identifier: APPROVED_MODEL, expected_digest: APPROVED_DIGEST },
  generation: {
    think: false,
    options: { temperature: 0, seed: 1, num_ctx: 4096, num_predict: 1024, top_p: 0.95, top_k: 20 },
  },
};

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// Single closed registry of approved versions: files are fixed names inside this directory, never caller-supplied.
const APPROVED_SCHEMA_SHA256 = "7b00af36bc3ccf5c03d81cef5526f0f016a8a8a09f0a2161661b1ddd811ca6fa";
const APPROVED_CONDITIONAL_SCHEMA_SHA256 = "2f6ad37a1105c475fb2ccf8207c5ab1630744a7ceb9d07bb61505b3593d51ae3";

// Closed registry keyed by prompt version, output mode and, only for B4-015, variant.
const APPROVED_PROFILES: Readonly<Record<string, ApprovedVersion>> = deepFreeze({
  "v1:prompt_only": {
    version: "v1",
    outputMode: "prompt_only",
    schemaSha256: null,
    experimentId: "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14",
    manifestFile: "manifest.json",
    promptFile: "prompt.txt",
    manifestSha256: "7378fdb44637a13192b2e5f5426b4bb6aeabf32704131d348e3d40a29392671b",
    promptSha256: "3bb69dc9ce873fa926add5432ae50863d339a653b4f4a70a4b2da31f8e184444",
    case: APPROVED_CASE,
    profile: APPROVED_PROFILE,
  },
  "v2:prompt_only": {
    version: "v2",
    outputMode: "prompt_only",
    schemaSha256: null,
    experimentId: "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14-PROMPT-V2",
    manifestFile: "manifest.v2.json",
    promptFile: "prompt.v2.txt",
    manifestSha256: "47f7dbc8920d1aafd4abbd6ad6828d15239248cad257c5a8f67cbfe737d48ef5",
    promptSha256: "0e47417daeb77afea0f677b614ad3380ec7c4b9298b8c4690a3305ca09a3d3a5",
    case: APPROVED_CASE,
    profile: APPROVED_PROFILE,
  },
  "v2:schema_constrained": {
    version: "v2",
    outputMode: "schema_constrained",
    schemaSha256: APPROVED_SCHEMA_SHA256,
    experimentId: "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14-B3-SCHEMA",
    manifestFile: "manifest.v2.schema.json",
    promptFile: "prompt.v2.txt",
    manifestSha256: "7d73a490f27316dd1469b6cae5d6d88c8fad6420f2522a46691349c4406a8a4e",
    promptSha256: "0e47417daeb77afea0f677b614ad3380ec7c4b9298b8c4690a3305ca09a3d3a5",
    case: APPROVED_CASE,
    profile: APPROVED_PROFILE,
  },
  "v2:conditional_schema": {
    version: "v2",
    outputMode: "conditional_schema",
    schemaSha256: APPROVED_CONDITIONAL_SCHEMA_SHA256,
    experimentId: "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14-B4-CONDITIONAL",
    manifestFile: "manifest.v2.conditional.json",
    promptFile: "prompt.v2.txt",
    manifestSha256: "7cd5f90f4127d11231d6d763733f063e4f6473bf2777cecf2fb0464fdad57f3a",
    promptSha256: "0e47417daeb77afea0f677b614ad3380ec7c4b9298b8c4690a3305ca09a3d3a5",
    case: APPROVED_CASE,
    profile: APPROVED_PROFILE,
  },
  "v2:conditional_schema:b4-015": {
    version: "v2",
    outputMode: "conditional_schema",
    schemaSha256: APPROVED_CONDITIONAL_SCHEMA_SHA256,
    experimentId: "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14-B4-CONDITIONAL-OLLAMA-015",
    manifestFile: "manifest.v2.conditional.ollama-015.json",
    promptFile: "prompt.v2.txt",
    manifestSha256: "2b9404a83063c84f67bc693466052758e878a75ae0d5b91abd8b3587eb9a4b46",
    promptSha256: "0e47417daeb77afea0f677b614ad3380ec7c4b9298b8c4690a3305ca09a3d3a5",
    case: APPROVED_CASE,
    profile: { ...APPROVED_PROFILE, expected_version: "0.40.15" },
  },
});

export function getApprovedVersion(
  version: unknown,
  outputMode: unknown = "prompt_only",
  runtimeVariant?: unknown,
): ApprovedVersion {
  const knownVersion = PROMPT_VERSIONS.find((item) => item === version);
  const knownMode = OUTPUT_MODES.find((item) => item === outputMode);
  const approved = knownVersion !== undefined && knownMode !== undefined
    && (runtimeVariant === undefined || runtimeVariant === "b4-015")
    ? APPROVED_PROFILES[`${knownVersion}:${knownMode}${runtimeVariant === undefined ? "" : ":b4-015"}`]
    : undefined;
  if (approved === undefined) {
    throw new Error("Unknown or unapproved prompt version or output mode.");
  }
  return approved;
}

// This manual experimental projection is checked against predicate-required in offline tests.
export function createConditionalSchema() {
  const schema = structuredClone(z.toJSONSchema(sinV2OutputSchema));
  const units = schema.properties?.units;
  if (!units || typeof units !== "object" || Array.isArray(units)) {
    throw new Error("Generated SIN V2 schema has no units schema.");
  }
  const items = units.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    throw new Error("Generated SIN V2 schema has no unit items schema.");
  }
  if (Object.hasOwn(items, "if") || Object.hasOwn(items, "then")) {
    throw new Error("Generated SIN V2 schema already has a conditional.");
  }
  Object.assign(items, {
    if: {
      required: ["act"],
      properties: { act: { enum: ["instruct", "ask", "qualify", "inform"] } },
    },
    then: {
      required: ["predicate"],
      properties: { predicate: { type: "string" } },
    },
  });
  return schema;
}

// Both formats are pinned by the hash of their deterministic serialization.
export function createApprovedOutputFormat(
  expectedSha256: unknown,
  mode: "schema_constrained" | "conditional_schema" = "schema_constrained",
): Record<string, unknown> {
  if (mode !== "schema_constrained" && mode !== "conditional_schema") {
    throw new Error("Unknown or unapproved schema mode.");
  }
  const serialized = JSON.stringify(mode === "conditional_schema"
    ? createConditionalSchema()
    : z.toJSONSchema(sinV2OutputSchema));
  if (typeof expectedSha256 !== "string" || sha256Hex(serialized) !== expectedSha256) {
    throw new Error("The generated JSON Schema does not match the approved schema hash.");
  }
  return JSON.parse(serialized) as Record<string, unknown>;
}

export function readApprovedArtifacts(version: unknown, outputMode: unknown = "prompt_only", runtimeVariant?: unknown): {
  approved: ApprovedVersion;
  manifestBytes: Buffer;
  promptBytes: Buffer;
} {
  const approved = getApprovedVersion(version, outputMode, runtimeVariant);
  const manifestBytes = readFileSync(new URL(`./${approved.manifestFile}`, import.meta.url));
  const promptBytes = readFileSync(new URL(`./${approved.promptFile}`, import.meta.url));
  if (sha256Hex(manifestBytes) !== approved.manifestSha256) {
    throw new Error("The manifest bytes do not match the approved manifest hash for this version.");
  }
  if (sha256Hex(promptBytes) !== approved.promptSha256) {
    throw new Error("The prompt bytes do not match the approved prompt hash for this version.");
  }
  return { approved, manifestBytes, promptBytes };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Hex(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

// The capability holder verifies case, profile and artifact integrity itself, so no caller can skip these checks.
function verifyExecutionPlan(plan: OllamaExecutionPlan): string {
  if (plan?.authorizeRealInference !== true) {
    throw new Error("Explicit real-inference authorization is required.");
  }
  if (Object.hasOwn(plan, "format")) {
    throw new Error("A caller-supplied output format is not accepted.");
  }
  const { approved, manifestBytes, promptBytes } = readApprovedArtifacts(
    plan.promptVersion ?? "v1",
    plan.outputMode ?? "prompt_only",
    plan.runtimeVariant,
  );
  if (typeof plan.caseId !== "string"
    || plan.caseId !== approved.case.id
    || plan.caseMessage !== approved.case.message) {
    throw new Error("Ollama execution requires the single authorized synthetic development case.");
  }
  if (!isRecord(plan.configuration)
    || canonicalJson(plan.configuration) !== canonicalJson(approved.profile)) {
    throw new Error("Ollama model or generation configuration does not match the approved profile.");
  }
  if (typeof plan.manifestSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(plan.manifestSha256)) {
    throw new Error("A valid manifestSha256 from the loaded manifest bytes is required.");
  }
  if (plan.manifestSha256.toLowerCase() !== approved.manifestSha256) {
    throw new Error("manifestSha256 does not match the effective manifest bytes.");
  }
  const manifest: unknown = JSON.parse(manifestBytes.toString("utf8"));
  if (!isRecord(manifest)
    || manifest.experiment_id !== approved.experimentId
    || manifest.prompt_path !== approved.promptFile
    || (approved.outputMode !== "prompt_only"
      ? manifest.output_mode !== approved.outputMode || manifest.schema_sha256 !== approved.schemaSha256
      : manifest.output_mode !== undefined || manifest.schema_sha256 !== undefined)
    || canonicalJson(manifest.ollama_configuration) !== canonicalJson(plan.configuration)
    || canonicalJson(manifest.cases) !== canonicalJson([approved.case])) {
    throw new Error("The execution configuration differs from the effective manifest file.");
  }
  const actualHashes = {
    prompt_sha256: sha256Hex(promptBytes),
    contract_sha256: sha256Hex(readFileSync(new URL("../sin-v2/contract.ts", import.meta.url))),
    validator_sha256: sha256Hex(readFileSync(new URL("../sin-v2/validator.ts", import.meta.url))),
  };
  if (typeof plan.prompt !== "string"
    || sha256Hex(plan.prompt) !== actualHashes.prompt_sha256
    || canonicalJson(manifest.artifact_hashes) !== canonicalJson(actualHashes)) {
    throw new Error("Prompt, contract, or validator integrity check failed.");
  }
  return JSON.stringify({
    model: plan.configuration.model.identifier,
    messages: [
      { role: "system", content: plan.prompt },
      { role: "user", content: plan.caseMessage },
    ],
    stream: false,
    think: plan.configuration.generation.think,
    options: plan.configuration.generation.options,
    ...(approved.outputMode !== "prompt_only"
      ? { format: createApprovedOutputFormat(approved.schemaSha256, approved.outputMode) }
      : {}),
  });
}

interface OllamaClientInternals {
  transport: EvaluationTransport;
  // eslint-disable-next-line no-unused-vars
  inspectModel(configuration: OllamaWindowsConfiguration): Promise<ModelMetadata>;
}

// The generative transport is never exposed as a property: it exists only inside runVerified().
export class OllamaWindowsClient {
  readonly timeoutMs: number;
  readonly bridgeOrigin: "powershell" | "injected";
  readonly #internals: OllamaClientInternals;

  constructor(
    token: symbol,
    internals: OllamaClientInternals,
    timeoutMs: number,
    bridgeOrigin: "powershell" | "injected",
  ) {
    if (token !== clientConstructionToken) {
      throw new Error("OllamaWindowsClient can only be created by createOllamaWindowsClient.");
    }
    this.#internals = internals;
    this.timeoutMs = timeoutMs;
    this.bridgeOrigin = bridgeOrigin;
  }

  static isGenuine(value: unknown): value is OllamaWindowsClient {
    return typeof value === "object" && value !== null && #internals in value;
  }

  inspectModel(configuration: OllamaWindowsConfiguration): Promise<ModelMetadata> {
    return this.#internals.inspectModel(configuration);
  }

  // Every path to /api/chat is verified here; the only request the guarded transport can send is the approved one.
  async runVerified<T>(
    plan: OllamaExecutionPlan,
    // eslint-disable-next-line no-unused-vars
    run: (transport: EvaluationTransport, metadata: ModelMetadata) => Promise<T>,
  ): Promise<T> {
    const expectedBodyText = verifyExecutionPlan(plan);
    const configuration = plan.configuration;
    if (configuration.timeout_ms !== this.timeoutMs) {
      throw new Error("Ollama transport timeout differs from the frozen manifest configuration.");
    }
    const metadata = await this.#internals.inspectModel(configuration);
    if (metadata.status !== "observed"
      || metadata.provider !== "ollama"
      || metadata.model !== configuration.model.identifier
      || metadata.digest?.toLowerCase() !== configuration.model.expected_digest.toLowerCase()
      || metadata.version !== configuration.expected_version) {
      throw new Error("Ollama preflight metadata does not verify the configured model and digest.");
    }
    let active = true;
    let invocations = 0;
    const guarded: EvaluationTransport = async (request) => {
      const rejected = (errorCode: string): TransportResult => ({
        kind: "transport_error",
        response: null,
        errorCode,
        duration: { milliseconds: 0, source: "observed" },
        modelMetadata: unknownModelMetadata,
      });
      if (!active) return rejected("ollama_transport_revoked");
      if (invocations >= 1) return rejected("ollama_invocation_limit");
      if (request.bodyText !== expectedBodyText) return rejected("ollama_request_rejected");
      invocations += 1;
      return this.#internals.transport(request);
    };
    try {
      return await run(guarded, metadata);
    } finally {
      active = false;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBase64(value: unknown): value is string {
  return typeof value === "string"
    && (value.length === 0 || /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value));
}

function isHeaderMap(value: unknown): value is Record<string, string> {
  return isRecord(value)
    && Object.entries(value).every(([name, content]) =>
      /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)
      && typeof content === "string"
      && !/[\r\n]/.test(content));
}

function hasApprovedBridgeHeaders(method: string, headers: Record<string, string>): boolean {
  if (method === "GET") return Object.keys(headers).length === 0;
  return Object.keys(headers).length === 1
    && headers["content-type"] === "application/json";
}

function isBridgeResult(value: unknown): value is OllamaBridgeResult {
  if (!isRecord(value)) return false;
  if (value.kind === "response") {
    return Number.isInteger(value.status)
      && (value.status as number) >= 100
      && (value.status as number) <= 599
      && isHeaderMap(value.headers)
      && isBase64(value.bodyBase64)
      && typeof value.durationMilliseconds === "number"
      && Number.isFinite(value.durationMilliseconds)
      && value.durationMilliseconds >= 0;
  }
  return (value.kind === "transport_error" || value.kind === "timeout")
    && typeof value.errorCode === "string"
    && /^[a-z0-9_]+$/.test(value.errorCode)
    && typeof value.durationMilliseconds === "number"
    && Number.isFinite(value.durationMilliseconds)
    && value.durationMilliseconds >= 0;
}

function approvedEndpoint(method: string, value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const allowedPaths: Record<string, string[]> = {
    GET: ["/api/version", "/api/tags"],
    POST: ["/api/show", "/api/chat"],
  };
  if (!["GET", "POST"].includes(method)
    || url.protocol !== "http:"
    || url.hostname !== APPROVED_HOST
    || url.port !== APPROVED_PORT
    || url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
    || !allowedPaths[method]?.includes(url.pathname)) {
    return null;
  }
  return url;
}

function encodeBridgeRequest(request: OllamaBridgeRequest): string {
  return Buffer.from(JSON.stringify({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body_base64: request.bodyBase64,
    timeout_ms: request.timeoutMs,
  }), "utf8").toString("base64");
}

const powershellScript = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$timer = [Diagnostics.Stopwatch]::StartNew()
$client = $null
$handler = $null
$response = $null
$message = $null
$cancellation = $null
$phase = 'validation'
try {
  $encodedInput = [Console]::In.ReadToEnd().Trim()
  $inputBytes = [Convert]::FromBase64String($encodedInput)
  $request = ConvertFrom-Json -InputObject ([Text.Encoding]::UTF8.GetString($inputBytes))
  $uri = [Uri]$request.url
  $allowed = (($request.method -eq 'GET' -and @('/api/version', '/api/tags') -contains $uri.AbsolutePath) -or
    ($request.method -eq 'POST' -and @('/api/show', '/api/chat') -contains $uri.AbsolutePath))
  if ($uri.Scheme -ne 'http' -or $uri.Host -ne '127.0.0.1' -or $uri.Port -ne 11434 -or
      $uri.UserInfo -ne '' -or $uri.Query -ne '' -or $uri.Fragment -ne '' -or -not $allowed) {
    throw 'bridge_request_rejected'
  }
  if ([int]$request.timeout_ms -lt 1 -or [int]$request.timeout_ms -gt 180000) {
    throw 'bridge_timeout_rejected'
  }
  if (($request.method -eq 'GET' -and (@($request.headers.PSObject.Properties).Count -ne 0 -or $null -ne $request.body_base64)) -or
      ($request.method -eq 'POST' -and (@($request.headers.PSObject.Properties).Count -ne 1 -or
        $request.headers.'content-type' -ne 'application/json' -or $null -eq $request.body_base64))) {
    throw 'bridge_headers_or_body_rejected'
  }
  $phase = 'initialization'
  Add-Type -AssemblyName System.Net.Http
  $handler = [System.Net.Http.HttpClientHandler]::new()
  $handler.UseProxy = $false
  $handler.UseDefaultCredentials = $false
  $handler.UseCookies = $false
  $handler.AllowAutoRedirect = $false
  $client = [System.Net.Http.HttpClient]::new($handler)
  $client.Timeout = [System.Threading.Timeout]::InfiniteTimeSpan
  $message = [System.Net.Http.HttpRequestMessage]::new(
    [System.Net.Http.HttpMethod]::new([string]$request.method), $uri)
  if ($null -ne $request.body_base64) {
    $body = [Convert]::FromBase64String([string]$request.body_base64)
    $message.Content = [System.Net.Http.ByteArrayContent]::new($body)
  }
  foreach ($header in $request.headers.PSObject.Properties) {
    if ($header.Name -ieq 'content-type' -and $null -ne $message.Content) {
      $message.Content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse([string]$header.Value)
    } elseif (-not $message.Headers.TryAddWithoutValidation([string]$header.Name, [string]$header.Value)) {
      throw 'bridge_header_rejected'
    }
  }
  $phase = 'http'
  $cancellation = [System.Threading.CancellationTokenSource]::new([int]$request.timeout_ms)
  $httpResponse = $client.SendAsync($message, $cancellation.Token).GetAwaiter().GetResult()
  $response = $httpResponse
  $responseBytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $headers = @{}
  foreach ($header in $response.Headers) { $headers[$header.Key] = [string]::Join(', ', [string[]]$header.Value) }
  foreach ($header in $response.Content.Headers) { $headers[$header.Key] = [string]::Join(', ', [string[]]$header.Value) }
  $result = @{
    kind = 'response'
    status = [int]$response.StatusCode
    headers = $headers
    bodyBase64 = [Convert]::ToBase64String($responseBytes)
    durationMilliseconds = $timer.Elapsed.TotalMilliseconds
  }
} catch {
  $kind = 'transport_error'
  $code = 'ollama_connection_error'
  if ($phase -eq 'validation') {
    $code = 'bridge_request_rejected'
  } elseif ($phase -eq 'initialization') {
    $code = 'bridge_initialization_error'
  } elseif ($null -ne $cancellation -and $cancellation.IsCancellationRequested) {
    $kind = 'timeout'
    $code = 'ollama_request_timeout'
  }
  $result = @{
    kind = $kind
    errorCode = $code
    durationMilliseconds = $timer.Elapsed.TotalMilliseconds
  }
} finally {
  if ($null -ne $response) { $response.Dispose() }
  if ($null -ne $message) { $message.Dispose() }
  if ($null -ne $client) { $client.Dispose() }
  if ($null -ne $handler) { $handler.Dispose() }
  if ($null -ne $cancellation) { $cancellation.Dispose() }
  $timer.Stop()
}
$json = ConvertTo-Json -InputObject $result -Depth 8 -Compress
$output = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
[Console]::Out.Write($output)
`;

function createPowerShellOllamaBridge(): OllamaBridge {
  return async (request) => {
    const url = approvedEndpoint(request.method, request.url);
    if (!url
      || !Number.isInteger(request.timeoutMs)
      || request.timeoutMs < 1
      || request.timeoutMs > MAX_TIMEOUT_MS
      || !isHeaderMap(request.headers)
      || !hasApprovedBridgeHeaders(request.method, request.headers)
      || (request.method === "GET" && request.bodyBase64 !== null)
      || (request.method === "POST" && request.bodyBase64 === null)
      || (request.bodyBase64 !== null && !isBase64(request.bodyBase64))) {
      return {
        kind: "transport_error",
        errorCode: "bridge_request_rejected",
        durationMilliseconds: 0,
      };
    }

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        powershellScript,
      ], { stdio: "pipe", windowsHide: true });
    } catch {
      return {
        kind: "transport_error",
        errorCode: "powershell_start_failed",
        durationMilliseconds: 0,
      };
    }
    const childStdin = child.stdin;
    const childStdout = child.stdout;
    const childStderr = child.stderr;
    if (!childStdin || !childStdout || !childStderr) {
      child.kill();
      return {
        kind: "transport_error",
        errorCode: "powershell_pipe_unavailable",
        durationMilliseconds: 0,
      };
    }

    return new Promise<OllamaBridgeResult>((resolve) => {
      const output: Buffer[] = [];
      let outputBytes = 0;
      let settled = false;
      const started = Date.now();
      const finish = (result: OllamaBridgeResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      };
      const timeout = setTimeout(() => {
        child.kill();
        finish({
          kind: "timeout",
          errorCode: "powershell_process_timeout",
          durationMilliseconds: Date.now() - started,
        });
      }, request.timeoutMs + 5_000);

      childStdout.on("data", (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_BRIDGE_OUTPUT_BYTES) {
          child.kill();
          finish({
            kind: "transport_error",
            errorCode: "bridge_response_too_large",
            durationMilliseconds: Date.now() - started,
          });
          return;
        }
        output.push(chunk);
      });
      childStderr.on("data", () => undefined);
      child.once("error", () => {
        finish({
          kind: "transport_error",
          errorCode: "powershell_process_error",
          durationMilliseconds: Date.now() - started,
        });
      });
      child.once("close", (code) => {
        if (settled) return;
        if (code !== 0) {
          finish({
            kind: "transport_error",
            errorCode: "powershell_process_error",
            durationMilliseconds: Date.now() - started,
          });
          return;
        }
        try {
          const outputBase64 = Buffer.concat(output).toString("ascii").trim();
          if (!isBase64(outputBase64) || outputBase64.length === 0) throw new Error();
          const parsed: unknown = JSON.parse(Buffer.from(outputBase64, "base64").toString("utf8"));
          if (!isBridgeResult(parsed)) throw new Error();
          finish(parsed);
        } catch {
          finish({
            kind: "transport_error",
            errorCode: "bridge_protocol_error",
            durationMilliseconds: Date.now() - started,
          });
        }
      });
      childStdin.once("error", () => {
        if (!settled) {
          child.kill();
          finish({
            kind: "transport_error",
            errorCode: "bridge_ipc_error",
            durationMilliseconds: Date.now() - started,
          });
        }
      });
      childStdin.end(encodeBridgeRequest(request), "ascii");
    });
  };
}

async function callBridge(bridge: OllamaBridge, request: OllamaBridgeRequest): Promise<OllamaBridgeResult> {
  try {
    const result = await bridge(request);
    if (isBridgeResult(result)) return result;
  } catch {
    return {
      kind: "transport_error",
      errorCode: "bridge_process_or_ipc_error",
      durationMilliseconds: 0,
    };
  }
  return {
    kind: "transport_error",
    errorCode: "bridge_protocol_error",
    durationMilliseconds: 0,
  };
}

function asResponseCapture(result: Extract<OllamaBridgeResult, { kind: "response" }>): HttpResponseCapture {
  const responseBytes = Buffer.from(result.bodyBase64, "base64");
  return {
    status: result.status,
    headers: result.headers,
    bodyText: responseBytes.toString("utf8"),
    bodyBase64: result.bodyBase64,
  };
}

function parseJsonObject(response: HttpResponseCapture): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(response.bodyText);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildOllamaWindowsClient(
  bridge: OllamaBridge,
  timeoutMs: number,
  origin: "powershell" | "injected",
): OllamaWindowsClient {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error("Ollama transport timeout must be between 1 and 180000 milliseconds.");
  }
  const transport: EvaluationTransport = async (request) => {
    const endpoint = approvedEndpoint(request.method, request.url);
    if (!endpoint || endpoint.pathname !== "/api/chat") {
      return {
        kind: "transport_error",
        response: null,
        errorCode: "ollama_endpoint_rejected",
        duration: { milliseconds: 0, source: "observed" },
        modelMetadata: unknownModelMetadata,
      };
    }

    const result = await callBridge(bridge, {
      method: "POST",
      url: endpoint.toString(),
      headers: request.headers,
      bodyBase64: Buffer.from(request.bodyText, "utf8").toString("base64"),
      timeoutMs,
    });
    if (result.kind !== "response") {
      return {
        kind: result.kind,
        response: null,
        errorCode: result.errorCode,
        duration: { milliseconds: result.durationMilliseconds, source: "observed" },
        modelMetadata: unknownModelMetadata,
      };
    }
    return {
      kind: "response",
      response: asResponseCapture(result),
      duration: { milliseconds: result.durationMilliseconds, source: "observed" },
      modelMetadata: unknownModelMetadata,
    };
  };

  const inspectModel: OllamaWindowsClient["inspectModel"] = async (configuration) => {
    if (configuration.endpoint !== "http://127.0.0.1:11434/api/chat"
      || !Number.isInteger(configuration.timeout_ms)
      || configuration.timeout_ms < 1
      || configuration.timeout_ms > MAX_TIMEOUT_MS
      || (configuration.expected_version !== "0.40.14" && configuration.expected_version !== "0.40.15")
      || !/^[a-f0-9]{64}$/i.test(configuration.model.expected_digest)) {
      throw new Error("Ollama preflight configuration is invalid.");
    }
    const diagnostic = async (
      method: "GET" | "POST",
      path: "/api/version" | "/api/tags" | "/api/show",
      bodyText: string | null = null,
    ): Promise<Record<string, unknown>> => {
      const result = await callBridge(bridge, {
        method,
        url: `http://127.0.0.1:11434${path}`,
        headers: bodyText === null ? {} : { "content-type": "application/json" },
        bodyBase64: bodyText === null ? null : Buffer.from(bodyText, "utf8").toString("base64"),
        timeoutMs: configuration.timeout_ms,
      });
      if (result.kind !== "response") {
        throw new Error(`Ollama preflight failed: ${result.errorCode}.`);
      }
      const response = asResponseCapture(result);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Ollama preflight HTTP status ${response.status}.`);
      }
      const parsed = parseJsonObject(response);
      if (!parsed) throw new Error("Ollama preflight returned invalid JSON.");
      return parsed;
    };

    const versionResponse = await diagnostic("GET", "/api/version");
    if (typeof versionResponse.version !== "string"
      || versionResponse.version !== configuration.expected_version) {
      throw new Error("Ollama version does not match the approved configuration.");
    }
    const tagsResponse = await diagnostic("GET", "/api/tags");
    if (!Array.isArray(tagsResponse.models)) throw new Error("Ollama model inventory is invalid.");
    const installedModel = tagsResponse.models.find((item: unknown) =>
      isRecord(item) && item.name === configuration.model.identifier);
    if (!isRecord(installedModel)
      || typeof installedModel.digest !== "string"
      || installedModel.digest.toLowerCase() !== configuration.model.expected_digest.toLowerCase()) {
      throw new Error("Ollama model tag or digest does not match the approved configuration.");
    }
    const showResponse = await diagnostic(
      "POST",
      "/api/show",
      JSON.stringify({ model: configuration.model.identifier }),
    );
    if (!isRecord(showResponse.thinking)
      || !Array.isArray(showResponse.thinking.values)
      || !showResponse.thinking.values.includes(false)) {
      throw new Error("Ollama model does not confirm the configured think:false option.");
    }

    return {
      status: "observed",
      provider: "ollama",
      model: configuration.model.identifier,
      version: versionResponse.version,
      digest: installedModel.digest,
    };
  };

  return new OllamaWindowsClient(clientConstructionToken, { transport, inspectModel }, timeoutMs, origin);
}

export function createOllamaWindowsClient(timeoutMs = MAX_TIMEOUT_MS): OllamaWindowsClient {
  return buildOllamaWindowsClient(createPowerShellOllamaBridge(), timeoutMs, "powershell");
}

// Test seam: the real PowerShell bridge is module-private; clients built here are labelled "injected" in reports.
export function createOllamaWindowsClientWithBridge(
  bridge: OllamaBridge,
  timeoutMs = MAX_TIMEOUT_MS,
): OllamaWindowsClient {
  return buildOllamaWindowsClient(bridge, timeoutMs, "injected");
}

export function createSimulatedTransport(
  scenario: SimulatedTransportScenario = { kind: "response" },
): EvaluationTransport {
  const transport: EvaluationTransport = async (request) => {
    scenario.onInvoke?.(request);
    const duration = {
      milliseconds: scenario.durationMilliseconds ?? 0,
      source: "simulated" as const,
    };

    if (scenario.kind === "transport_error" || scenario.kind === "timeout") {
      return {
        kind: scenario.kind,
        response: null,
        errorCode: scenario.errorCode,
        duration,
        modelMetadata: unknownModelMetadata,
      };
    }

    const requestBody: unknown = JSON.parse(request.bodyText);
    if (typeof requestBody !== "object"
      || requestBody === null
      || !("messages" in requestBody)
      || !Array.isArray(requestBody.messages)) {
      throw new Error("Simulated request body does not contain a messages array.");
    }
    const userMessage = requestBody.messages.find((item: unknown) =>
      typeof item === "object"
      && item !== null
      && "role" in item
      && item.role === "user"
      && "content" in item
      && typeof item.content === "string");
    if (!userMessage || typeof userMessage.content !== "string") {
      throw new Error("Simulated request body does not contain a user message.");
    }
    const simulatedSinOutput = {
      schema: "sin-v2-experimental",
      message: userMessage.content,
      status: "abstained",
      units: [],
    };
    const simulatedEnvelope = JSON.stringify({
      message: { content: JSON.stringify(simulatedSinOutput) },
      done: true,
      done_reason: "stop",
    });

    return {
      kind: "response",
      response: {
        status: scenario.status ?? 200,
        headers: scenario.headers ?? { "content-type": "application/json" },
        bodyText: scenario.bodyText ?? simulatedEnvelope,
      },
      duration,
      modelMetadata: unknownModelMetadata,
    };
  };
  simulatedTransports.add(transport);
  return transport;
}

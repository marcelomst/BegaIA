// Path: scripts/semantic-normalization-spike/sin-v2-evaluation/runner.test.ts

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { z } from "zod";

import { COMMUNICATIVE_ACTS, sinV2OutputSchema, type CommunicativeAct } from "../sin-v2/contract";
import { validateSinV2 } from "../sin-v2/validator";

import {
  evaluateCase,
  loadManifestAndPrompt,
  parseCliArguments,
  runEvaluation,
  runOllamaEvaluation,
  type EvaluationCase,
  type EvaluationManifest,
} from "./runner";
import {
  createApprovedOutputFormat,
  createConditionalSchema,
  createOllamaWindowsClient,
  createOllamaWindowsClientWithBridge,
  OllamaWindowsClient,
  type OllamaExecutionPlan,
  createSimulatedTransport,
  getApprovedVersion,
  PROMPT_VERSIONS,
  unknownModelMetadata,
  type EvaluationTransport,
  type HttpRequestCapture,
  type OllamaBridge,
  type OllamaBridgeRequest,
  type OllamaBridgeResult,
} from "./transport";

const evaluationCase: EvaluationCase = { id: "synthetic-test", message: "Hola" };
const prompt = "development_draft";
const executionId = "test-execution-001";
const loaded = loadManifestAndPrompt();

function validSin(message: string): string {
  return JSON.stringify({
    schema: "sin-v2-experimental",
    message,
    status: "abstained",
    units: [],
  });
}

function envelope(content: string, metadata: Record<string, unknown> = {}): string {
  return JSON.stringify({
    message: { content },
    done: true,
    done_reason: "stop",
    ...metadata,
  });
}

function responseTransport(
  bodyText: string,
  status = 200,
  metadata: Record<string, unknown> = {},
): EvaluationTransport {
  return createSimulatedTransport({
    kind: "response",
    status,
    headers: { "content-type": "application/json", "x-lab-capture": "simulated" },
    bodyText: envelope(bodyText, metadata),
    durationMilliseconds: 7,
  });
}

function evaluationManifest(): EvaluationManifest {
  return {
    ...loaded.manifest,
    cases: [evaluationCase],
  };
}

function bridgeResponse(
  bodyText: string,
  status = 200,
  headers: Record<string, string> = { "content-type": "application/json" },
): OllamaBridgeResult {
  return {
    kind: "response",
    status,
    headers,
    bodyBase64: Buffer.from(bodyText, "utf8").toString("base64"),
    durationMilliseconds: 12,
  };
}

function fakeOllamaBridge(
  overrides: { digest?: string; version?: string; model?: string; thinkingValues?: unknown[]; chatStatus?: number } = {},
): { bridge: OllamaBridge; requests: OllamaBridgeRequest[] } {
  const requests: OllamaBridgeRequest[] = [];
  const bridge: OllamaBridge = async (request) => {
    requests.push(request);
    const path = new URL(request.url).pathname;
    if (path === "/api/version") {
      return bridgeResponse(JSON.stringify({ version: overrides.version ?? "0.40.14" }));
    }
    if (path === "/api/tags") {
      return bridgeResponse(JSON.stringify({
        models: [{
          name: overrides.model ?? loaded.manifest.ollama_configuration.model.identifier,
          digest: overrides.digest
            ?? loaded.manifest.ollama_configuration.model.expected_digest,
        }],
      }));
    }
    if (path === "/api/show") {
      return bridgeResponse(JSON.stringify({
        thinking: { values: overrides.thinkingValues ?? [false, true], default: true },
      }));
    }
    if (path === "/api/chat") {
      return bridgeResponse(
        envelope(validSin(loaded.manifest.cases[0].message), {
          model: loaded.manifest.ollama_configuration.model.identifier,
          done: true,
          done_reason: "stop",
        }),
        overrides.chatStatus ?? 200,
        { "content-type": "application/json", "x-lab-bridge": "simulated" },
      );
    }
    return {
      kind: "transport_error",
      errorCode: "unexpected_test_endpoint",
      durationMilliseconds: 0,
    };
  };
  return { bridge, requests };
}

test("manifest and prompt remain development-only and document the SIN V2 contract", () => {
  assert.equal(loaded.manifest.status, "development_draft");
  assert.equal(loaded.manifest.execution_mode, "simulated_only");
  assert.deepEqual(loaded.manifest.model_metadata, unknownModelMetadata);
  assert.equal(loaded.manifest.transport_configuration.url, "http://ollama-lab.invalid/api/chat");
  assert.match(loaded.prompt, /exclusivamente un objeto JSON válido/);
  assert.match(loaded.prompt, /instruct.*ask.*affirm.*reject.*correct.*retract/s);
  assert.ok(loaded.manifest.cases.every((item) => Object.keys(item).sort().join(",") === "id,message"));
});

test("simulated runner retains exact serialized request, HTTP response, and SIN content", async () => {
  const receivedRequestTexts: string[] = [];
  const transport = createSimulatedTransport({
    kind: "response",
    onInvoke: (request) => {
      receivedRequestTexts.push(JSON.stringify(request));
    },
  });
  const report = await runEvaluation(evaluationManifest(), prompt, transport, {
    executionId,
    manifestSha256: loaded.manifestSha256,
  });
  const record = report.results[0];
  assert.equal(report.execution_mode, "simulated_only");
  const expectedRequest: HttpRequestCapture = {
    method: "POST",
    url: loaded.manifest.transport_configuration.url,
    headers: { "content-type": "application/json" },
    bodyText: JSON.stringify({
      model: "sin-v2-simulated-test",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: evaluationCase.message },
      ],
      stream: false,
    }),
  };
  assert.deepEqual(record.request_http, expectedRequest);
  assert.equal(receivedRequestTexts[0], JSON.stringify(record.request_http));
  assert.equal(JSON.parse(record.request_http.bodyText).model, "sin-v2-simulated-test");
  assert.equal(record.raw_outer_response_text, record.http_response?.bodyText);
  assert.equal(record.sin_content_text, validSin(evaluationCase.message));
  assert.equal(record.classification, "valid");
  assert.equal(record.validated_output?.message, evaluationCase.message);
  assert.equal(record.generation_metadata.source, "simulated");
  assert.equal(record.duration.source, "simulated");
  assert.equal(record.duration.milliseconds, 0);
});

test("valid Ollama envelope extracts and validates SIN without changing captured text", async () => {
  const rawSin = validSin(evaluationCase.message);
  const rawEnvelope = envelope(rawSin, {
    done: true,
    done_reason: "stop",
    model: "simulated-model",
    created_at: "simulated-timestamp",
    prompt_eval_count: 21,
    eval_count: 8,
    total_duration: 0,
    load_duration: 0,
    prompt_eval_duration: 0,
    eval_duration: 0,
  });
  const transport = createSimulatedTransport({ kind: "response", bodyText: rawEnvelope });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    transport,
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.raw_outer_response_text, rawEnvelope);
  assert.equal(record.sin_content_text, rawSin);
  assert.equal(record.generation_metadata.model, "simulated-model");
  assert.equal(record.generation_metadata.created_at, "simulated-timestamp");
  assert.equal(record.generation_metadata.done, true);
  assert.equal(record.generation_metadata.done_reason, "stop");
  assert.equal(record.generation_metadata.prompt_eval_count, 21);
  assert.equal(record.generation_metadata.eval_count, 8);
  assert.equal(record.generation_metadata.total_duration, 0);
  assert.equal(record.generation_metadata.eval_duration, 0);
  assert.equal(record.classification, "valid");
});

test("invalid outer JSON is classified separately and retained byte-for-byte", async () => {
  const raw = '{"message":';
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    createSimulatedTransport({ kind: "response", bodyText: raw }),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "outer_json_invalid");
  assert.equal(record.raw_outer_response_text, raw);
  assert.equal(record.sin_content_text, null);
});

test("valid outer JSON with an invalid Ollama envelope is an outer-envelope error", async () => {
  const rawEnvelope = JSON.stringify({ response: "not a chat envelope", done: true });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    createSimulatedTransport({ kind: "response", bodyText: rawEnvelope }),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "outer_json_invalid");
  assert.equal(record.raw_outer_response_text, rawEnvelope);
  assert.equal(record.sin_content_text, null);
});

test("non-success HTTP response takes precedence and preserves its JSON body", async () => {
  const raw = JSON.stringify({ error: "simulated server failure" });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    createSimulatedTransport({ kind: "response", status: 503, bodyText: raw }),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "http_error");
  assert.equal(record.http_response?.status, 503);
  assert.equal(record.raw_outer_response_text, raw);
  assert.equal(record.sin_content_text, null);
});

test("transport failure has no response and remains distinct from timeout", async () => {
  const transport = createSimulatedTransport({
    kind: "transport_error",
    errorCode: "simulated_connection_failure",
  });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    transport,
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "transport_error");
  assert.equal(record.transport_error_code, "simulated_connection_failure");
  assert.equal(record.http_response, null);
  assert.equal(record.raw_outer_response_text, null);
  assert.equal(record.generation_metadata.source, "not_available");
});

test("timeout has no response and is classified before HTTP or parse checks", async () => {
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    createSimulatedTransport({ kind: "timeout", errorCode: "simulated_timeout" }),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "timeout");
  assert.equal(record.http_response, null);
  assert.equal(record.raw_outer_response_text, null);
});

test("invalid SIN JSON is distinct from invalid outer-envelope JSON", async () => {
  const rawSin = '{"schema":';
  const rawEnvelope = envelope(rawSin);
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    responseTransport(rawSin),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "sin_json_invalid");
  assert.equal(record.sin_content_text, rawSin);
  assert.equal(record.raw_outer_response_text, rawEnvelope);
});

test("structurally invalid SIN retains validator issues", async () => {
  const rawSin = JSON.stringify({ schema: "unknown", message: evaluationCase.message });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    responseTransport(rawSin),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "schema_invalid");
  assert.ok(record.validation_issues.some((issue) => issue.code === "schema"));
  assert.equal(record.validated_output, null);
});

test("explicit done=false or done_reason=length confirms truncation", async () => {
  for (const metadata of [{ done: false }, { done_reason: "length" }]) {
    const rawEnvelope = JSON.stringify({ message: { content: '{"schema":' }, ...metadata });
    const record = await evaluateCase(
      evaluationCase,
      prompt,
      createSimulatedTransport({ kind: "response", bodyText: rawEnvelope }),
      evaluationManifest(),
      executionId,
      loaded.manifestSha256,
    );
    assert.equal(record.classification, "truncated");
    assert.equal(record.raw_outer_response_text, rawEnvelope);
    assert.deepEqual(record.generation_metadata.available_fields.sort(), Object.keys(metadata).sort());
  }
});

test("incomplete SIN JSON without explicit truncation evidence is not called truncated", async () => {
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    responseTransport('{"schema":'),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "sin_json_invalid");
  assert.equal(record.generation_metadata.done, true);
  assert.equal(record.generation_metadata.done_reason, "stop");
});

test("runner does not repair malformed content or retry a transport", async () => {
  const rawSin = `\`\`\`json\n${validSin(evaluationCase.message)}\n\`\`\``;
  const rawEnvelope = envelope(rawSin);
  let calls = 0;
  const transport = createSimulatedTransport({
    kind: "response",
    bodyText: rawEnvelope,
    onInvoke: () => {
      calls += 1;
    },
  });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    transport,
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(calls, 1);
  assert.equal(record.classification, "sin_json_invalid");
  assert.equal(record.sin_content_text, rawSin);
});

test("report carries execution identity, effective hashes, and incomplete reproducibility state", async () => {
  const report = await runEvaluation(evaluationManifest(), prompt, createSimulatedTransport(), {
    executionId,
    manifestSha256: loaded.manifestSha256,
  });
  const expectedPromptHash = createHash("sha256").update(prompt).digest("hex");
  assert.equal(report.execution_id, executionId);
  assert.equal(report.results[0].execution_id, executionId);
  assert.equal(report.results[0].experiment_id, loaded.manifest.experiment_id);
  assert.equal(report.provenance.prompt_sha256, expectedPromptHash);
  assert.equal(report.provenance.manifest_sha256, loaded.manifestSha256);
  assert.equal(report.results[0].prompt_sha256, expectedPromptHash);
  assert.equal(report.results[0].manifest_sha256, loaded.manifestSha256);
  const contractBytes = readFileSync(new URL("../sin-v2/contract.ts", import.meta.url));
  const validatorBytes = readFileSync(new URL("../sin-v2/validator.ts", import.meta.url));
  assert.equal(
    report.provenance.artifacts.contract_sha256,
    createHash("sha256").update(contractBytes).digest("hex"),
  );
  assert.equal(
    report.provenance.artifacts.validator_sha256,
    createHash("sha256").update(validatorBytes).digest("hex"),
  );
  assert.equal(report.provenance.reproducibility.status, "incomplete");
});

test("configuration declared in the manifest is separate from unknown observed model metadata", async () => {
  const report = await runEvaluation(evaluationManifest(), prompt, createSimulatedTransport(), {
    manifestSha256: loaded.manifestSha256,
  });
  assert.equal(report.declared_configuration.transport.url, loaded.manifest.transport_configuration.url);
  assert.deepEqual(report.declared_configuration.model, {
    identifier: "sin-v2-simulated-test",
    status: "simulated_only",
  });
  assert.deepEqual(report.declared_configuration.model_metadata, unknownModelMetadata);
  assert.deepEqual(report.results[0].model_metadata, unknownModelMetadata);
  assert.notEqual(report.declared_configuration.model?.identifier, report.results[0].model_metadata.model);
  assert.ok(report.provenance.reproducibility.reasons.includes("model_digest_unknown"));
});

test("missing model configuration blocks request construction before transport invocation", async () => {
  const manifest = { ...evaluationManifest(), model_configuration: null };
  let transportCalls = 0;
  const transport = createSimulatedTransport({
    kind: "response",
    onInvoke: () => {
      transportCalls += 1;
    },
  });
  await assert.rejects(
    evaluateCase(
      evaluationCase,
      prompt,
      transport,
      manifest,
      executionId,
      loaded.manifestSha256,
    ),
    /model identifier is required/,
  );
  assert.equal(transportCalls, 0);
});

test("explicit truncation without message.content is classified and records envelope anomaly", async () => {
  const cases = [
    { done: false },
    { done_reason: "length" },
  ];
  for (const signal of cases) {
    const rawEnvelope = JSON.stringify(signal);
    const record = await evaluateCase(
      evaluationCase,
      prompt,
      createSimulatedTransport({ kind: "response", bodyText: rawEnvelope }),
      evaluationManifest(),
      executionId,
      loaded.manifestSha256,
    );
    assert.equal(record.classification, "truncated");
    assert.equal(record.raw_outer_response_text, rawEnvelope);
    assert.ok(record.validation_issues.some((issue) => issue.code === "outer-envelope-message-invalid"));
  }
});

test("envelope missing content without explicit truncation evidence remains outer_json_invalid", async () => {
  const rawEnvelope = JSON.stringify({ message: {}, done: true, done_reason: "stop" });
  const record = await evaluateCase(
    evaluationCase,
    prompt,
    createSimulatedTransport({ kind: "response", bodyText: rawEnvelope }),
    evaluationManifest(),
    executionId,
    loaded.manifestSha256,
  );
  assert.equal(record.classification, "outer_json_invalid");
  assert.equal(record.raw_outer_response_text, rawEnvelope);
  assert.ok(record.validation_issues.some((issue) => issue.code === "outer-envelope-content-invalid"));
});

test("records are delivered to the in-memory sink and returned in the report", async () => {
  const captured: unknown[] = [];
  const report = await runEvaluation(evaluationManifest(), prompt, createSimulatedTransport(), {
    manifestSha256: loaded.manifestSha256,
    sink: (record) => captured.push(record),
  });
  assert.equal(captured.length, report.results.length);
  assert.equal(captured[0], report.results[0]);
});

test("runner uses the existing validator and contains no network or productive-runtime imports", () => {
  const runnerSource = readFileSync(new URL("./runner.ts", import.meta.url), "utf8");
  const transportSource = readFileSync(new URL("./transport.ts", import.meta.url), "utf8");
  assert.match(runnerSource, /validateSinV2\(parsedSin\)/);
  assert.match(runnerSource, /from "\.\.\/sin-v2\/validator"/);
  assert.doesNotMatch(runnerSource, /from ["'](?:\.\.\/\.\.\/\.\.\/lib\/|node:https?|axios|undici)/);
  assert.doesNotMatch(transportSource, /\bfetch\s*\(|from ["'](?:node:https?|axios|undici)/);
});

test("captured manifest hash is the hash of the exact source snapshot", () => {
  const manifestBytes = readFileSync(new URL("./manifest.json", import.meta.url));
  const hash = createHash("sha256").update(manifestBytes).digest("hex");
  assert.equal(loaded.manifestSha256, hash);
});

test("manifest-pinned prompt, contract, and validator hashes match effective bytes", () => {
  const promptBytes = readFileSync(new URL("./prompt.txt", import.meta.url));
  const contractBytes = readFileSync(new URL("../sin-v2/contract.ts", import.meta.url));
  const validatorBytes = readFileSync(new URL("../sin-v2/validator.ts", import.meta.url));
  assert.deepEqual(loaded.manifest.artifact_hashes, {
    prompt_sha256: createHash("sha256").update(promptBytes).digest("hex"),
    contract_sha256: createHash("sha256").update(contractBytes).digest("hex"),
    validator_sha256: createHash("sha256").update(validatorBytes).digest("hex"),
  });
});

test("runEvaluation rejects a missing manifest hash before invoking transport", async () => {
  let transportCalls = 0;
  const transport = createSimulatedTransport({
    kind: "response",
    onInvoke: () => {
      transportCalls += 1;
    },
  });
  for (const args of [
    [evaluationManifest(), prompt, transport],
    [evaluationManifest(), prompt, transport, {}],
  ]) {
    await assert.rejects(
      Reflect.apply(runEvaluation, undefined, args),
      /manifestSha256 from the loaded manifest bytes is required/,
    );
  }
  assert.equal(transportCalls, 0);
});

test("runEvaluation rejects malformed manifest hashes before invoking transport", async () => {
  let transportCalls = 0;
  const transport = createSimulatedTransport({
    kind: "response",
    onInvoke: () => {
      transportCalls += 1;
    },
  });
  for (const manifestSha256 of ["", "not-a-hash", "a".repeat(63), "g".repeat(64)]) {
    await assert.rejects(
      runEvaluation(evaluationManifest(), prompt, transport, { manifestSha256 }),
      /manifestSha256 from the loaded manifest bytes is required/,
    );
  }
  assert.equal(transportCalls, 0);
});

test("Ollama authorization is required before diagnostics or generation", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  await assert.rejects(
    runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      client,
      { manifestSha256: loaded.manifestSha256 },
    ),
    /Explicit real-inference authorization is required/,
  );
  assert.equal(requests.length, 0);
});

test("Ollama timeout must match the frozen manifest before diagnostics", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  await assert.rejects(
    runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge, 30_000),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    ),
    /timeout differs from the frozen manifest/,
  );
  assert.equal(requests.length, 0);
});

test("Ollama preflight blocks a tag or digest mismatch before /api/chat", async () => {
  const { bridge, requests } = fakeOllamaBridge({ digest: "0".repeat(64) });
  await assert.rejects(
    runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    ),
    /tag or digest does not match/,
  );
  assert.deepEqual(requests.map((request) => new URL(request.url).pathname), [
    "/api/version",
    "/api/tags",
  ]);
});

test("Ollama preflight requires think:false to be supported", async () => {
  const { bridge, requests } = fakeOllamaBridge({ thinkingValues: [true] });
  await assert.rejects(
    runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    ),
    /does not confirm the configured think:false option/,
  );
  assert.deepEqual(requests.map((request) => new URL(request.url).pathname), [
    "/api/version",
    "/api/tags",
    "/api/show",
  ]);
});

test("Ollama preflight rejects an unapproved server version before tag and show checks", async () => {
  const { bridge, requests } = fakeOllamaBridge({ version: "0.40.15" });
  await assert.rejects(
    runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    ),
    /version does not match/,
  );
  assert.deepEqual(requests.map((request) => new URL(request.url).pathname), ["/api/version"]);
});

test("authorized simulated bridge run serializes exact generation settings and preserves raw capture", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const report = await runOllamaEvaluation(
    loaded.manifest,
    loaded.prompt,
    createOllamaWindowsClientWithBridge(bridge),
    {
      executionId,
      manifestSha256: loaded.manifestSha256,
      authorizeRealInference: true,
    },
  );
  const request = report.results[0].request_http;
  const body = JSON.parse(request.bodyText);
  assert.equal(report.execution_mode, "ollama_windows");
  assert.equal(request.url, loaded.manifest.ollama_configuration.endpoint);
  assert.equal(body.model, "qwen3.5:4b-q4_K_M");
  assert.equal(body.stream, false);
  assert.equal(body.think, false);
  assert.deepEqual(body.options, {
    temperature: 0,
    seed: 1,
    num_ctx: 4096,
    num_predict: 1024,
    top_p: 0.95,
    top_k: 20,
  });
  assert.deepEqual(Object.keys(body), ["model", "messages", "stream", "think", "options"]);
  assert.equal(Object.hasOwn(body, "timeout_ms"), false);
  assert.equal(report.declared_configuration.ollama.timeout_ms, 180_000);
  assert.equal(requests.length, 4);
  const chatRequest = requests[3];
  assert.equal(new URL(chatRequest.url).pathname, "/api/chat");
  assert.equal(chatRequest.timeoutMs, 180_000);
  assert.equal(
    Buffer.from(chatRequest.bodyBase64 ?? "", "base64").toString("utf8"),
    request.bodyText,
  );
  assert.deepEqual(chatRequest.headers, request.headers);
  const record = report.results[0];
  assert.equal(record.classification, "valid");
  assert.equal(record.duration.source, "observed");
  assert.equal(record.duration.milliseconds, 12);
  assert.equal(record.raw_outer_response_text, record.http_response?.bodyText);
  assert.equal(
    record.http_response?.bodyBase64,
    Buffer.from(record.raw_outer_response_text ?? "", "utf8").toString("base64"),
  );
  assert.equal(record.http_response?.status, 200);
  assert.deepEqual(record.http_response?.headers, {
    "content-type": "application/json",
    "x-lab-bridge": "simulated",
  });
  assert.equal(record.sin_content_text, validSin(loaded.manifest.cases[0].message));
  assert.equal(record.generation_metadata.model, "qwen3.5:4b-q4_K_M");
  assert.equal(report.preflight_model_metadata.digest, loaded.manifest.ollama_configuration.model.expected_digest);
  assert.deepEqual(record.model_metadata, unknownModelMetadata);
  assert.equal(report.provenance.reproducibility.status, "incomplete");
});

test("message.thinking is retained only inside the raw envelope, never treated as SIN content", async () => {
  const { bridge: diagnostics } = fakeOllamaBridge();
  const thinking = "simulated private reasoning field";
  const rawEnvelope = JSON.stringify({
    message: {
      thinking,
      content: validSin(loaded.manifest.cases[0].message),
    },
    done: true,
    done_reason: "stop",
  });
  const bridge: OllamaBridge = async (request) => {
    if (new URL(request.url).pathname === "/api/chat") {
      return bridgeResponse(rawEnvelope);
    }
    return diagnostics(request);
  };
  const report = await runOllamaEvaluation(
    loaded.manifest,
    loaded.prompt,
    createOllamaWindowsClientWithBridge(bridge),
    {
      manifestSha256: loaded.manifestSha256,
      authorizeRealInference: true,
    },
  );
  const record = report.results[0];
  assert.equal(record.raw_outer_response_text, rawEnvelope);
  assert.equal(record.sin_content_text, validSin(loaded.manifest.cases[0].message));
  assert.notEqual(record.sin_content_text, thinking);
});

test("Ollama HTTP errors retain status, headers, and body and are not retried", async () => {
  let chatCalls = 0;
  const { bridge, requests } = fakeOllamaBridge({ chatStatus: 503 });
  const countingBridge: OllamaBridge = async (request) => {
    if (new URL(request.url).pathname === "/api/chat") chatCalls += 1;
    return bridge(request);
  };
  const report = await runOllamaEvaluation(
    loaded.manifest,
    loaded.prompt,
    createOllamaWindowsClientWithBridge(countingBridge),
    {
      manifestSha256: loaded.manifestSha256,
      authorizeRealInference: true,
    },
  );
  const record = report.results[0];
  assert.equal(chatCalls, 1);
  assert.equal(requests.length, 4);
  assert.equal(new URL(requests[3].url).pathname, "/api/chat");
  assert.equal(record.classification, "http_error");
  assert.equal(record.http_response?.status, 503);
  assert.equal(record.http_response?.headers["x-lab-bridge"], "simulated");
  assert.equal(record.raw_outer_response_text, record.http_response?.bodyText);
});

test("Ollama timeout and connection or process errors remain distinct and sanitized", async () => {
  for (const [failure, expectedClassification] of [
    ["timeout", "timeout"],
    ["connection", "transport_error"],
  ] as const) {
    let chatCalls = 0;
    const bridge: OllamaBridge = async (request) => {
      const path = new URL(request.url).pathname;
      if (path === "/api/chat") {
        chatCalls += 1;
        return {
          kind: failure === "timeout" ? "timeout" : "transport_error",
          errorCode: failure === "timeout" ? "ollama_request_timeout" : "powershell_process_error",
          durationMilliseconds: 180_000,
        };
      }
      return fakeOllamaBridge().bridge(request);
    };
    const report = await runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    );
    assert.equal(chatCalls, 1);
    assert.equal(report.results[0].classification, expectedClassification);
    assert.equal(report.results[0].http_response, null);
    assert.equal(report.results[0].raw_outer_response_text, null);
  }
});

test("PowerShell and IPC failures are sanitized and do not retry or leak details", async () => {
  const secretLikeDetail = "credential=must-not-be-recorded";
  let chatCalls = 0;
  const { bridge: diagnostics } = fakeOllamaBridge();
  const bridge: OllamaBridge = async (request) => {
    if (new URL(request.url).pathname === "/api/chat") {
      chatCalls += 1;
      throw new Error(secretLikeDetail);
    }
    return diagnostics(request);
  };
  const report = await runOllamaEvaluation(
    loaded.manifest,
    loaded.prompt,
    createOllamaWindowsClientWithBridge(bridge),
    {
      manifestSha256: loaded.manifestSha256,
      authorizeRealInference: true,
    },
  );
  assert.equal(chatCalls, 1);
  assert.equal(report.results[0].classification, "transport_error");
  assert.equal(report.results[0].transport_error_code, "bridge_process_or_ipc_error");
  assert.equal(JSON.stringify(report).includes(secretLikeDetail), false);

  let ipcChatCalls = 0;
  const ipcBridge: OllamaBridge = async (request) => {
    if (new URL(request.url).pathname === "/api/chat") {
      ipcChatCalls += 1;
      return {
        kind: "response",
        status: 200,
        headers: { "content-type": "application/json" },
        bodyBase64: "invalid-base64",
        durationMilliseconds: 1,
        detail: secretLikeDetail,
      };
    }
    return diagnostics(request);
  };
  const ipcReport = await runOllamaEvaluation(
    loaded.manifest,
    loaded.prompt,
    createOllamaWindowsClientWithBridge(ipcBridge),
    {
      manifestSha256: loaded.manifestSha256,
      authorizeRealInference: true,
    },
  );
  assert.equal(ipcChatCalls, 1);
  assert.equal(ipcReport.results[0].classification, "transport_error");
  assert.equal(ipcReport.results[0].transport_error_code, "bridge_protocol_error");
  assert.equal(JSON.stringify(ipcReport).includes(secretLikeDetail), false);
});

test("Ollama execution blocks changed artifact hashes before diagnostics", async () => {
  let diagnosticCalls = 0;
  const bridge: OllamaBridge = async () => {
    diagnosticCalls += 1;
    return bridgeResponse("{}");
  };
  const manifest = {
    ...loaded.manifest,
    artifact_hashes: {
      ...loaded.manifest.artifact_hashes,
      prompt_sha256: "0".repeat(64),
    },
  };
  await assert.rejects(
    runOllamaEvaluation(
      manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    ),
    /in-memory manifest differs/,
  );
  assert.equal(diagnosticCalls, 0);
});

test("Ollama execution blocks changed generation settings before diagnostics", async () => {
  let diagnosticCalls = 0;
  const bridge: OllamaBridge = async () => {
    diagnosticCalls += 1;
    return bridgeResponse("{}");
  };
  const manifest = {
    ...loaded.manifest,
    ollama_configuration: {
      ...loaded.manifest.ollama_configuration,
      generation: {
        ...loaded.manifest.ollama_configuration.generation,
        options: {
          ...loaded.manifest.ollama_configuration.generation.options,
          temperature: 0.1,
        },
      },
    },
  };
  await assert.rejects(
    runOllamaEvaluation(
      manifest,
      loaded.prompt,
      createOllamaWindowsClientWithBridge(bridge),
      {
        manifestSha256: loaded.manifestSha256,
        authorizeRealInference: true,
      },
    ),
    /does not match the approved profile/,
  );
  assert.equal(diagnosticCalls, 0);
});

test("Ollama endpoint allowlist rejects non-loopback destinations before bridge invocation", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const result = await client.runVerified(
    approvedPlan(),
    (transport) => transport({
      method: "POST",
      url: "http://example.invalid/api/chat",
      headers: { "content-type": "application/json" },
      bodyText: approvedBodyText(),
    }),
  );
  assert.equal(result.kind, "transport_error");
  assert.equal(result.errorCode, "ollama_endpoint_rejected");
  assert.equal(requests.some((request) => new URL(request.url).pathname === "/api/chat"), false);
});

test("CLI uses the exact loaded manifest hash and has no serialized-object fallback", () => {
  const runnerSource = readFileSync(new URL("./runner.ts", import.meta.url), "utf8");
  assert.match(runnerSource, /if \(args\.length === 0\)/);
  assert.match(runnerSource, /--mode=ollama-windows/);
  assert.match(runnerSource, /--authorize-real-inference/);
  assert.match(runnerSource, /const \{ manifest, prompt, manifestSha256 \} = loadManifestAndPrompt\(\)/);
  assert.match(runnerSource, /runEvaluation\(manifest, prompt, createSimulatedTransport\(\), \{ manifestSha256 \}\)/);
  assert.doesNotMatch(runnerSource, /sha256\(JSON\.stringify\(manifest\)\)/);
});

function chatCalls(requests: OllamaBridgeRequest[]): number {
  return requests.filter((request) => new URL(request.url).pathname === "/api/chat").length;
}

function approvedPlan(overrides: Partial<OllamaExecutionPlan> = {}): OllamaExecutionPlan {
  return {
    authorizeRealInference: true,
    configuration: loaded.manifest.ollama_configuration,
    prompt: loaded.prompt,
    caseId: loaded.manifest.cases[0].id,
    caseMessage: loaded.manifest.cases[0].message,
    manifestSha256: loaded.manifestSha256,
    ...overrides,
  };
}

function approvedBodyText(): string {
  const configuration = loaded.manifest.ollama_configuration;
  return JSON.stringify({
    model: configuration.model.identifier,
    messages: [
      { role: "system", content: loaded.prompt },
      { role: "user", content: loaded.manifest.cases[0].message },
    ],
    stream: false,
    think: configuration.generation.think,
    options: configuration.generation.options,
  });
}

const authorizedOptions = { manifestSha256: loaded.manifestSha256, authorizeRealInference: true } as const;

test("bypass: runEvaluation and evaluateCase reject unregistered transports before calling them", async () => {
  let calls = 0;
  const unregistered: EvaluationTransport = async () => {
    calls += 1;
    throw new Error("must not be called");
  };
  const lookalike = Object.assign(unregistered, { simulated: true, kind: "simulated" });
  for (const transport of [unregistered, lookalike]) {
    await assert.rejects(
      runEvaluation(evaluationManifest(), prompt, transport, { manifestSha256: loaded.manifestSha256 }),
      /Only registered simulated transports/,
    );
    await assert.rejects(
      evaluateCase(evaluationCase, prompt, transport, evaluationManifest(), executionId, loaded.manifestSha256),
      /Only registered simulated transports/,
    );
  }
  assert.equal(calls, 0);
});

test("bypass: the generative transport and bridge are not reachable from public exports", async () => {
  const transportModule = await import("./transport");
  const runnerModule = await import("./runner");
  const exported = [...Object.keys(transportModule), ...Object.keys(runnerModule)];
  assert.equal(exported.includes("createPowerShellOllamaBridge"), false);
  assert.equal(exported.includes("isOllamaWindowsTransport"), false);
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  assert.equal("transport" in client, false);
  assert.equal(Object.values(client).some((value) => typeof value === "function"), false);
  const transportSource = readFileSync(new URL("./transport.ts", import.meta.url), "utf8");
  assert.doesNotMatch(transportSource, /export function createPowerShellOllamaBridge/);
  assert.equal(requests.length, 0);
});

test("bypass: runVerified requires authorization before any bridge call", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  for (const authorization of [undefined, false, "true", 1]) {
    await assert.rejects(
      Reflect.apply(client.runVerified, client, [approvedPlan({ authorizeRealInference: authorization as never }), async () => null]),
      /Explicit real-inference authorization is required/,
    );
  }
  assert.equal(requests.length, 0);
});

test("bypass: structural or forged clients cannot satisfy runOllamaEvaluation", async () => {
  let calls = 0;
  const count = async (): Promise<never> => {
    calls += 1;
    throw new Error("must not be called");
  };
  const forged = [
    { transport: count, inspectModel: count, runVerified: count, timeoutMs: 180_000 },
    Object.create(OllamaWindowsClient.prototype),
  ];
  for (const client of forged) {
    await assert.rejects(
      runOllamaEvaluation(loaded.manifest, loaded.prompt, client, authorizedOptions),
      /created by createOllamaWindowsClient is required/,
    );
  }
  assert.throws(
    () => new OllamaWindowsClient(Symbol("forged"), { transport: count, inspectModel: count }, 180_000, "injected"),
    /can only be created by createOllamaWindowsClient/,
  );
  assert.equal(calls, 0);
});

test("bypass: a direct runVerified call is blocked on digest mismatch, altered requests, and repeat use", async () => {
  const mismatch = fakeOllamaBridge({ digest: "b".repeat(64) });
  await assert.rejects(
    createOllamaWindowsClientWithBridge(mismatch.bridge).runVerified(approvedPlan(), async () => null),
    /tag or digest does not match/,
  );
  assert.equal(chatCalls(mismatch.requests), 0);

  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const frozen = loaded.manifest.ollama_configuration;
  let leaked: EvaluationTransport | null = null;
  const results = await client.runVerified(approvedPlan(), async (transport) => {
    leaked = transport;
    const base = {
      method: "POST" as const,
      url: frozen.endpoint,
      headers: { "content-type": "application/json" },
    };
    const altered = await transport({
      ...base,
      bodyText: JSON.stringify({ model: frozen.model.identifier, stream: false, think: true, options: frozen.generation.options }),
    });
    const body = approvedBodyText();
    const first = await transport({ ...base, bodyText: body });
    const second = await transport({ ...base, bodyText: body });
    return { altered, first, second };
  });
  assert.equal(results.altered.kind === "transport_error" && results.altered.errorCode, "ollama_request_rejected");
  assert.equal(results.first.kind, "response");
  assert.equal(results.second.kind === "transport_error" && results.second.errorCode, "ollama_invocation_limit");
  assert.equal(chatCalls(requests), 1);
  const revoked = await (leaked as unknown as EvaluationTransport)({
    method: "POST", url: frozen.endpoint, headers: {}, bodyText: "{}",
  });
  assert.equal(revoked.kind === "transport_error" && revoked.errorCode, "ollama_transport_revoked");
  assert.equal(chatCalls(requests), 1);
});

test("bypass: unauthorized case, incomplete configuration, and invalid hash block before any bridge call", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const frozen = loaded.manifest.ollama_configuration;
  const cases: Array<[EvaluationManifest, string | undefined, RegExp]> = [
    [{ ...loaded.manifest, cases: [{ id: "other-case", message: "Hola" }] }, undefined, /single authorized synthetic development case/],
    [{ ...loaded.manifest, ollama_configuration: { ...frozen, generation: { think: false, options: { temperature: 0 } } } } as unknown as EvaluationManifest, undefined, /approved profile/],
    [loaded.manifest, "f".repeat(64), /manifestSha256 does not match/],
    [loaded.manifest, "not-a-hash", /manifestSha256 from the loaded manifest bytes is required/],
  ];
  for (const [manifest, hash, expected] of cases) {
    await assert.rejects(
      runOllamaEvaluation(manifest, loaded.prompt, client, {
        manifestSha256: hash ?? loaded.manifestSha256,
        authorizeRealInference: true,
      }),
      expected,
    );
  }
  assert.equal(requests.length, 0);
});

test("bypass: CLI defaults to simulated mode and real mode keeps both authorization flags", () => {
  const source = readFileSync(new URL("./runner.ts", import.meta.url), "utf8");
  const parse = source.indexOf("parseCliArguments(process.argv.slice(2))");
  const simulated = source.indexOf('selection.mode === "simulated"');
  const clientCreation = source.indexOf("createOllamaWindowsClient(manifest");
  assert.ok(parse > -1 && simulated > parse && clientCreation > simulated);
  assert.match(source, /if \(selection\.mode === "simulated"\) \{[\s\S]*?createSimulatedTransport\(\)/);
  assert.match(source, /--mode=ollama-windows/);
  assert.match(source, /--authorize-real-inference/);
});

test("bypass: the eight B1 classifications remain declared", () => {
  const source = readFileSync(new URL("./runner.ts", import.meta.url), "utf8");
  const declaration = /export type ResultClassification =([\s\S]*?);/.exec(source)?.[1] ?? "";
  for (const name of ["valid", "transport_error", "timeout", "http_error", "outer_json_invalid", "sin_json_invalid", "schema_invalid", "truncated"]) {
    assert.ok(declaration.includes(`"${name}"`), name);
  }
});

test("direct runVerified is fully verified: case, profile, hashes, and prompt cannot be skipped", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const frozen = loaded.manifest.ollama_configuration;
  const attempts: Array<[Partial<OllamaExecutionPlan>, RegExp]> = [
    [{ caseId: "other" }, /single authorized synthetic development case/],
    [{ caseMessage: "otro mensaje" }, /single authorized synthetic development case/],
    [{ manifestSha256: "f".repeat(64) }, /manifestSha256 does not match/],
    [{ manifestSha256: "bad" }, /valid manifestSha256/],
    [{ prompt: "altered prompt" }, /integrity check failed/],
    [{ configuration: { ...frozen, generation: { ...frozen.generation, think: true } } }, /approved profile/],
    [{ configuration: { ...frozen, model: { ...frozen.model, identifier: "other:model" } } }, /approved profile/],
  ];
  for (const [overrides, expected] of attempts) {
    await assert.rejects(client.runVerified(approvedPlan(overrides), async () => "ran"), expected);
  }
  assert.equal(requests.length, 0);
});

test("the guarded transport only sends the exact approved request body", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const frozen = loaded.manifest.ollama_configuration;
  const altered = JSON.parse(approvedBodyText());
  altered.messages[1].content = "otro mensaje";
  const result = await client.runVerified(approvedPlan(), (transport) => transport({
    method: "POST",
    url: frozen.endpoint,
    headers: { "content-type": "application/json" },
    bodyText: JSON.stringify(altered),
  }));
  assert.equal(result.kind === "transport_error" && result.errorCode, "ollama_request_rejected");
  assert.equal(chatCalls(requests), 0);
});

test("public client exposes no generative method other than the fully verified runVerified", () => {
  const { bridge } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const methods = Object.getOwnPropertyNames(OllamaWindowsClient.prototype)
    .filter((name) => name !== "constructor")
    .sort();
  assert.deepEqual(methods, ["inspectModel", "runVerified"]);
  assert.deepEqual(Object.keys(client).sort(), ["bridgeOrigin", "timeoutMs"]);
  assert.equal(client.bridgeOrigin, "injected");
});

const fakePowerShellSource = (chatStatus: number, sinMessage: string): string => `#!/usr/bin/env node
const fs = require("node:fs");
const dir = process.env.FAKE_PS_DIR;
const input = fs.readFileSync(0, "ascii");
const request = JSON.parse(Buffer.from(input.trim(), "base64").toString("utf8"));
fs.appendFileSync(dir + "/calls.jsonl", JSON.stringify({ argv: process.argv.slice(2), input, request }) + "\\n");
const path = new URL(request.url).pathname;
const bodies = {
  "/api/version": { version: "0.40.14" },
  "/api/tags": { models: [{ name: "qwen3.5:4b-q4_K_M", digest: "${loaded.manifest.ollama_configuration.model.expected_digest}" }] },
  "/api/show": { thinking: { values: [false, true], default: true } },
  "/api/chat": { message: { content: JSON.stringify({ schema: "sin-v2-experimental", message: ${JSON.stringify(sinMessage)}, status: "abstained", units: [] }) }, done: true, done_reason: "stop" },
};
const status = path === "/api/chat" ? ${chatStatus} : 200;
const result = { kind: "response", status, headers: { "content-type": "application/json", "x-fake": "1" }, bodyBase64: Buffer.from(JSON.stringify(bodies[path])).toString("base64"), durationMilliseconds: 3 };
process.stdout.write(Buffer.from(JSON.stringify(result)).toString("base64"));
`;

async function withFakePowerShell<T>(
  chatStatus: number,
  // eslint-disable-next-line no-unused-vars
  run: (readCalls: () => Array<{ argv: string[]; input: string; request: OllamaBridgeRequestWire }>) => Promise<T>,
): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "fake-ps-"));
  const originalPath = process.env.PATH;
  const originalDir = process.env.FAKE_PS_DIR;
  try {
    const executable = join(directory, "powershell.exe");
    writeFileSync(executable, fakePowerShellSource(chatStatus, loaded.manifest.cases[0].message));
    chmodSync(executable, 0o755);
    writeFileSync(join(directory, "calls.jsonl"), "");
    process.env.PATH = `${directory}:${originalPath ?? ""}`;
    process.env.FAKE_PS_DIR = directory;
    return await run(() => readFileSync(join(directory, "calls.jsonl"), "utf8")
      .split("\n").filter(Boolean).map((line) => JSON.parse(line)));
  } finally {
    process.env.PATH = originalPath;
    if (originalDir === undefined) delete process.env.FAKE_PS_DIR; else process.env.FAKE_PS_DIR = originalDir;
    rmSync(directory, { recursive: true, force: true });
  }
}

interface OllamaBridgeRequestWire {
  method: string;
  url: string;
  headers: Record<string, string>;
  body_base64: string | null;
  timeout_ms: number;
}

test("real bridge code with a fake powershell.exe: stdin IPC, loopback, no proxy or redirects, exact body", async () => {
  await withFakePowerShell(200, async (readCalls) => {
    const report = await runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClient(loaded.manifest.ollama_configuration.timeout_ms),
      authorizedOptions,
    );
    const calls = readCalls();
    assert.deepEqual(calls.map((call) => new URL(call.request.url).pathname), [
      "/api/version", "/api/tags", "/api/show", "/api/chat",
    ]);
    for (const call of calls) {
      assert.equal(new URL(call.request.url).origin, "http://127.0.0.1:11434");
      assert.deepEqual(call.argv.slice(0, 3), ["-NoProfile", "-NonInteractive", "-Command"]);
      assert.equal(call.argv.length, 4);
      assert.match(call.argv[3], /UseProxy = \$false/);
      assert.match(call.argv[3], /UseCookies = \$false/);
      assert.match(call.argv[3], /AllowAutoRedirect = \$false/);
      assert.equal(call.argv.some((arg) => arg.includes(loaded.prompt.slice(0, 20))), false);
      assert.match(call.input.trim(), /^[A-Za-z0-9+/=]+$/);
    }
    const chat = calls[3].request;
    assert.equal(Buffer.from(chat.body_base64 ?? "", "base64").toString("utf8"), approvedBodyText());
    assert.deepEqual(chat.headers, { "content-type": "application/json" });
    assert.equal(chat.timeout_ms, 180_000);
    assert.equal(report.bridge_origin, "powershell");
    assert.equal(report.results[0].classification, "valid");
    assert.equal(report.results[0].http_response?.headers["x-fake"], "1");
  });
});

test("real bridge code: HTTP 500 is captured with status, headers, and body and is not retried", async () => {
  await withFakePowerShell(500, async (readCalls) => {
    const report = await runOllamaEvaluation(
      loaded.manifest,
      loaded.prompt,
      createOllamaWindowsClient(loaded.manifest.ollama_configuration.timeout_ms),
      authorizedOptions,
    );
    const record = report.results[0];
    assert.equal(record.classification, "http_error");
    assert.equal(record.http_response?.status, 500);
    assert.equal(record.http_response?.headers["x-fake"], "1");
    assert.ok((record.http_response?.bodyText ?? "").includes("sin-v2-experimental"));
    assert.equal(readCalls().filter((call) => new URL(call.request.url).pathname === "/api/chat").length, 1);
  });
});

test("real bridge code rejects credential headers and non-loopback targets before spawning", async () => {
  await withFakePowerShell(200, async (readCalls) => {
    const client = createOllamaWindowsClient(loaded.manifest.ollama_configuration.timeout_ms);
    const frozen = loaded.manifest.ollama_configuration;
    const base = { method: "POST" as const, bodyText: approvedBodyText() };
    const remote = await client.runVerified(approvedPlan(), (transport) => transport({
      ...base,
      url: "http://example.invalid/api/chat",
      headers: { "content-type": "application/json" },
    }));
    const credential = await client.runVerified(approvedPlan(), (transport) => transport({
      ...base,
      url: frozen.endpoint,
      headers: { "content-type": "application/json", authorization: "credential-must-not-pass" },
    }));
    const results = { remote, credential };
    assert.equal(results.remote.kind === "transport_error" && results.remote.errorCode, "ollama_endpoint_rejected");
    assert.equal(results.credential.kind === "transport_error" && results.credential.errorCode, "bridge_request_rejected");
    assert.equal(readCalls().filter((call) => new URL(call.request.url).pathname === "/api/chat").length, 0);
    assert.equal(JSON.stringify(results).includes("credential-must-not-pass"), false);
  });
});

const realPowerShellAvailable = process.env.SIN_V2_OFFLINE_ONLY !== "1" && !!spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.Major"], {
  encoding: "utf8",
}).stdout?.trim();

function effectivePowerShellScript(): string {
  const source = readFileSync(new URL("./transport.ts", import.meta.url), "utf8");
  const match = /const powershellScript = `([\s\S]*?)\n`;/.exec(source);
  assert.ok(match, "powershellScript constant not found");
  return match[1];
}

function runRealBridgeScript(request: Record<string, unknown>): Record<string, unknown> {
  const run = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", effectivePowerShellScript()], {
    input: Buffer.from(JSON.stringify(request), "utf8").toString("base64"),
    encoding: "ascii",
  });
  return JSON.parse(Buffer.from(run.stdout.trim(), "base64").toString("utf8"));
}

test("PowerShell script text keeps array-safe header counts and explicit System.Net.Http loading", () => {
  const script = effectivePowerShellScript();
  assert.equal(/\$request\.headers\.PSObject\.Properties\.Count/.test(script), false);
  assert.ok(script.includes("@($request.headers.PSObject.Properties).Count -ne 0"));
  assert.ok(script.includes("@($request.headers.PSObject.Properties).Count -ne 1"));
  const loadIndex = script.indexOf("Add-Type -AssemblyName System.Net.Http");
  assert.ok(loadIndex > script.indexOf("try {"));
  assert.ok(loadIndex < script.indexOf("HttpClientHandler]::new()"));
});

test("real PowerShell: GET with empty headers passes validation and System.Net.Http loads (no generative endpoint)", { skip: !realPowerShellAvailable }, () => {
  const result = runRealBridgeScript({
    method: "GET",
    url: "http://127.0.0.1:11434/api/version",
    headers: {},
    body_base64: null,
    timeout_ms: 30_000,
  });
  // Either the diagnostic GET is answered, or Ollama is unreachable; both prove validation and assembly loading passed.
  assert.ok(result.kind === "response" || result.errorCode === "ollama_connection_error", JSON.stringify(result.errorCode));
  assert.notEqual(result.errorCode, "bridge_request_rejected");
  assert.notEqual(result.errorCode, "bridge_initialization_error");
});

test("real PowerShell: validation failures are not reported as connection errors", { skip: !realPowerShellAvailable }, () => {
  const invalid: Array<Record<string, unknown>> = [
    { method: "GET", url: "http://example.invalid/api/version", headers: {}, body_base64: null, timeout_ms: 1000 },
    { method: "GET", url: "http://127.0.0.1:11434/api/chat", headers: {}, body_base64: null, timeout_ms: 1000 },
    { method: "GET", url: "http://127.0.0.1:11434/api/version", headers: { authorization: "credential-must-not-pass" }, body_base64: null, timeout_ms: 1000 },
    { method: "GET", url: "http://127.0.0.1:11434/api/version", headers: {}, body_base64: null, timeout_ms: 999_999 },
  ];
  for (const request of invalid) {
    const result = runRealBridgeScript(request);
    assert.equal(result.kind, "transport_error");
    assert.equal(result.errorCode, "bridge_request_rejected");
    assert.equal(Object.keys(result).sort().join(","), "durationMilliseconds,errorCode,kind");
    assert.equal(JSON.stringify(result).includes("credential-must-not-pass"), false);
  }
});

test("real PowerShell: a POST /api/show with a body is accepted by validation only with the approved content-type", { skip: !realPowerShellAvailable }, () => {
  const rejected = runRealBridgeScript({
    method: "POST",
    url: "http://127.0.0.1:11434/api/show",
    headers: {},
    body_base64: Buffer.from("{}", "utf8").toString("base64"),
    timeout_ms: 1000,
  });
  assert.equal(rejected.errorCode, "bridge_request_rejected");
});

test("bridge error codes keep their B1 external classes and are recorded unchanged", async () => {
  for (const [kind, errorCode] of [
    ["transport_error", "bridge_initialization_error"],
    ["transport_error", "bridge_request_rejected"],
    ["timeout", "ollama_request_timeout"],
  ] as const) {
    const record = await evaluateCase(
      loaded.manifest.cases[0],
      loaded.prompt,
      createSimulatedTransport({ kind, errorCode }),
      loaded.manifest,
      executionId,
      loaded.manifestSha256,
    );
    assert.equal(record.classification, kind);
    assert.equal(record.transport_error_code, errorCode);
  }
});

const V1_HASHES = {
  manifest: "7378fdb44637a13192b2e5f5426b4bb6aeabf32704131d348e3d40a29392671b",
  prompt: "3bb69dc9ce873fa926add5432ae50863d339a653b4f4a70a4b2da31f8e184444",
};
const V2_HASHES = {
  manifest: "47f7dbc8920d1aafd4abbd6ad6828d15239248cad257c5a8f67cbfe737d48ef5",
  prompt: "0e47417daeb77afea0f677b614ad3380ec7c4b9298b8c4690a3305ca09a3d3a5",
};
const GLOBAL_UNCERTAINTY_RULE = "Si no existe incertidumbre global, omití completamente la propiedad globalUncertainty. "
  + "Si existe, representala mediante un arreglo de cadenas no vacías. "
  + "Nunca utilices null para esta propiedad.";
const loadedV2 = loadManifestAndPrompt("v2");

function fileBytes(name: string): Buffer {
  return readFileSync(new URL(`./${name}`, import.meta.url));
}

function sha(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function v2Plan(overrides: Partial<OllamaExecutionPlan> = {}): OllamaExecutionPlan {
  return {
    authorizeRealInference: true,
    promptVersion: "v2",
    configuration: loadedV2.manifest.ollama_configuration,
    prompt: loadedV2.prompt,
    caseId: loadedV2.manifest.cases[0].id,
    caseMessage: loadedV2.manifest.cases[0].message,
    manifestSha256: loadedV2.manifestSha256,
    ...overrides,
  };
}

test("versioning: V1 prompt and manifest bytes are intact and V1 hashes are correct", () => {
  assert.equal(sha(fileBytes("prompt.txt")), V1_HASHES.prompt);
  assert.equal(sha(fileBytes("manifest.json")), V1_HASHES.manifest);
  assert.equal(loaded.manifestSha256, V1_HASHES.manifest);
  assert.equal(loaded.manifest.artifact_hashes.prompt_sha256, V1_HASHES.prompt);
});

test("versioning: the globalUncertainty rule exists only in V2 and V2 differs from V1 only by that sentence", () => {
  const v1 = fileBytes("prompt.txt").toString("utf8");
  const v2 = fileBytes("prompt.v2.txt").toString("utf8");
  assert.equal(v1.includes(GLOBAL_UNCERTAINTY_RULE), false);
  assert.equal(v2.split(GLOBAL_UNCERTAINTY_RULE).length - 1, 1);
  assert.equal(v2.replace(` ${GLOBAL_UNCERTAINTY_RULE}`, ""), v1);
});

test("versioning: V2 hashes are correct and the V2 manifest pins its own prompt", () => {
  assert.equal(sha(fileBytes("prompt.v2.txt")), V2_HASHES.prompt);
  assert.equal(sha(fileBytes("manifest.v2.json")), V2_HASHES.manifest);
  assert.equal(loadedV2.manifestSha256, V2_HASHES.manifest);
  assert.equal(loadedV2.manifest.prompt_path, "prompt.v2.txt");
  assert.equal(loadedV2.manifest.artifact_hashes.prompt_sha256, V2_HASHES.prompt);
  assert.equal(loadedV2.manifest.artifact_hashes.contract_sha256, loaded.manifest.artifact_hashes.contract_sha256);
  assert.equal(loadedV2.manifest.artifact_hashes.validator_sha256, loaded.manifest.artifact_hashes.validator_sha256);
});

test("versioning: V2 manifest differs from V1 only in identity, prompt path and prompt hash", () => {
  const strip = (manifest: EvaluationManifest): unknown => ({
    ...manifest,
    experiment_id: null,
    prompt_path: null,
    artifact_hashes: { ...manifest.artifact_hashes, prompt_sha256: null },
  });
  assert.deepEqual(strip(loadedV2.manifest), strip(loaded.manifest));
  assert.notEqual(loadedV2.manifest.experiment_id, loaded.manifest.experiment_id);
  assert.equal(loaded.manifest.experiment_id, "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14");
});

test("versioning: the registry is closed, frozen and pins both versions", () => {
  assert.deepEqual([...PROMPT_VERSIONS], ["v1", "v2"]);
  for (const bad of ["v3", "V2", "", "__proto__", "constructor", "../manifest.json", undefined, null, 2]) {
    assert.throws(() => getApprovedVersion(bad), /Unknown or unapproved prompt version/);
    if (bad !== undefined) {
      assert.throws(() => loadManifestAndPrompt(bad as never), /Unknown or unapproved prompt version/);
    }
  }
  const v1 = getApprovedVersion("v1");
  const v2 = getApprovedVersion("v2");
  assert.equal(v1.manifestSha256, V1_HASHES.manifest);
  assert.equal(v1.promptSha256, V1_HASHES.prompt);
  assert.equal(v2.manifestSha256, V2_HASHES.manifest);
  assert.equal(v2.promptSha256, V2_HASHES.prompt);
  assert.deepEqual([v1.manifestFile, v1.promptFile, v2.manifestFile, v2.promptFile],
    ["manifest.json", "prompt.txt", "manifest.v2.json", "prompt.v2.txt"]);
  assert.equal(Object.isFrozen(v1) && Object.isFrozen(v2) && Object.isFrozen(v2.profile.generation.options), true);
  assert.throws(() => {
    (v2 as { promptSha256: string }).promptSha256 = V1_HASHES.prompt;
  }, TypeError);
  assert.equal(getApprovedVersion("v2").promptSha256, V2_HASHES.prompt);
});

test("versioning: CLI without arguments still runs the simulated V1 evaluation", () => {
  const result = spawnSync(
    "pnpm",
    ["exec", "tsx", fileURLToPath(new URL("./runner.ts", import.meta.url))],
    { encoding: "utf8", cwd: fileURLToPath(new URL("../../../", import.meta.url)) },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout) as { execution_mode: string; experiment_id: string; provenance: { prompt_sha256: string } };
  assert.equal(report.execution_mode, "simulated_only");
  assert.equal(report.experiment_id, loaded.manifest.experiment_id);
  assert.equal(report.provenance.prompt_sha256, V1_HASHES.prompt);
});

test("versioning: CLI grammar keeps both flags, defaults to V1 and requires them for V2", () => {
  const flags = ["--mode=ollama-windows", "--authorize-real-inference"];
  assert.deepEqual(parseCliArguments([]), { mode: "simulated" });
  assert.deepEqual(parseCliArguments(flags), { mode: "ollama-windows", promptVersion: "v1" });
  assert.deepEqual(parseCliArguments([...flags].reverse()), { mode: "ollama-windows", promptVersion: "v1" });
  assert.deepEqual(parseCliArguments([...flags, "--prompt-version=v1"]), { mode: "ollama-windows", promptVersion: "v1" });
  assert.deepEqual(parseCliArguments(["--prompt-version=v2", ...flags]), { mode: "ollama-windows", promptVersion: "v2" });
  const rejected: string[][] = [
    ["--prompt-version=v2"],
    ["--mode=ollama-windows", "--prompt-version=v2"],
    ["--authorize-real-inference", "--prompt-version=v2"],
    ["--mode=ollama-windows"],
    ["--authorize-real-inference"],
    [...flags, "--prompt-version=v2", "--prompt-version=v1"],
    [...flags, "--prompt-version=v2", "--extra"],
  ];
  for (const args of rejected) {
    assert.throws(() => parseCliArguments(args), /Real inference requires both|Unknown or unapproved/);
  }
});

test("versioning: CLI rejects unknown versions and arbitrary paths", () => {
  const flags = ["--mode=ollama-windows", "--authorize-real-inference"];
  for (const version of ["v3", "V2", "", "../manifest.json", "prompt.v2.txt"]) {
    assert.throws(() => parseCliArguments([...flags, `--prompt-version=${version}`]), /Unknown or unapproved prompt version/);
  }
  for (const extra of ["--prompt-path=/tmp/x.txt", "--manifest=manifest.v2.json", "--manifest-path=../x", "/tmp/x.json"]) {
    assert.throws(() => parseCliArguments([...flags, extra]), /Real inference requires both/);
    assert.throws(() => parseCliArguments([...flags, "--prompt-version=v2", extra]), /Real inference requires both/);
  }
});

test("versioning: V1 real selection keeps its previous authorization contract", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  await assert.rejects(
    runOllamaEvaluation(loaded.manifest, loaded.prompt, createOllamaWindowsClientWithBridge(bridge), {
      manifestSha256: loaded.manifestSha256,
    }),
    /Explicit real-inference authorization is required/,
  );
  assert.equal(requests.length, 0);
  const report = await runOllamaEvaluation(loaded.manifest, loaded.prompt, createOllamaWindowsClientWithBridge(bridge), authorizedOptions);
  assert.equal(report.experiment_id, loaded.manifest.experiment_id);
  assert.equal(report.provenance.prompt_sha256, V1_HASHES.prompt);
  assert.equal(requests.filter((request) => new URL(request.url).pathname === "/api/chat").length, 1);
});

test("versioning: V2 real selection needs authorization, then sends the V2 prompt exactly once", async () => {
  const unauthorized = fakeOllamaBridge();
  await assert.rejects(
    runOllamaEvaluation(loadedV2.manifest, loadedV2.prompt, createOllamaWindowsClientWithBridge(unauthorized.bridge), {
      manifestSha256: loadedV2.manifestSha256,
      promptVersion: "v2",
    }),
    /Explicit real-inference authorization is required/,
  );
  assert.equal(unauthorized.requests.length, 0);

  const { bridge, requests } = fakeOllamaBridge();
  const report = await runOllamaEvaluation(loadedV2.manifest, loadedV2.prompt, createOllamaWindowsClientWithBridge(bridge), {
    manifestSha256: loadedV2.manifestSha256,
    authorizeRealInference: true,
    promptVersion: "v2",
  });
  assert.equal(report.experiment_id, loadedV2.manifest.experiment_id);
  assert.equal(report.provenance.prompt_sha256, V2_HASHES.prompt);
  assert.equal(report.provenance.manifest_sha256, V2_HASHES.manifest);
  const chats = requests.filter((request) => new URL(request.url).pathname === "/api/chat");
  assert.equal(chats.length, 1);
  assert.ok(Buffer.from(chats[0].bodyBase64 ?? "", "base64").toString("utf8").includes(GLOBAL_UNCERTAINTY_RULE));
});

test("versioning: mismatched hashes, crossed artifacts and unknown versions reject before any bridge call", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = () => createOllamaWindowsClientWithBridge(bridge);
  const cases: Array<[string, () => Promise<unknown>, RegExp]> = [
    ["V2 manifest with V1 hash", () => runOllamaEvaluation(loadedV2.manifest, loadedV2.prompt, client(), {
      manifestSha256: V1_HASHES.manifest, authorizeRealInference: true, promptVersion: "v2",
    }), /manifestSha256 does not match/],
    ["V2 manifest and prompt under default V1", () => runOllamaEvaluation(loadedV2.manifest, loadedV2.prompt, client(), {
      manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true,
    }), /manifest identity or prompt path|manifestSha256 does not match/],
    ["V1 manifest and prompt under V2", () => runOllamaEvaluation(loaded.manifest, loaded.prompt, client(), {
      manifestSha256: loaded.manifestSha256, authorizeRealInference: true, promptVersion: "v2",
    }), /manifest identity or prompt path|manifestSha256 does not match/],
    ["V2 manifest with V1 prompt", () => runOllamaEvaluation(loadedV2.manifest, loaded.prompt, client(), {
      manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true, promptVersion: "v2",
    }), /Prompt, contract, or validator integrity check failed/],
    ["V1 manifest with V2 prompt", () => runOllamaEvaluation(loaded.manifest, loadedV2.prompt, client(), authorizedOptions),
      /Prompt, contract, or validator integrity check failed/],
    ["unknown version", () => runOllamaEvaluation(loadedV2.manifest, loadedV2.prompt, client(), {
      manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true, promptVersion: "v3" as never,
    }), /Unknown or unapproved prompt version/],
    ["tampered V2 prompt", () => runOllamaEvaluation(loadedV2.manifest, `${loadedV2.prompt} `, client(), {
      manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true, promptVersion: "v2",
    }), /Prompt, contract, or validator integrity check failed/],
  ];
  for (const [label, run, expected] of cases) {
    await assert.rejects(run(), expected, label);
  }
  assert.equal(requests.length, 0);
});

test("versioning: direct runVerified cannot bypass the approved registry", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const forgedHash = "a".repeat(64);
  const attempts: Array<[string, OllamaExecutionPlan, RegExp]> = [
    ["caller-supplied manifest hash", v2Plan({ manifestSha256: forgedHash }), /manifestSha256 does not match/],
    ["V2 plan with V1 prompt", v2Plan({ prompt: loaded.prompt }), /Prompt, contract, or validator integrity check failed/],
    ["V1 plan labelled as V2", approvedPlan({ promptVersion: "v2" }), /manifestSha256 does not match/],
    ["V2 plan labelled as V1", v2Plan({ promptVersion: "v1" }), /manifestSha256 does not match/],
    ["unknown version", v2Plan({ promptVersion: "v3" as never }), /Unknown or unapproved prompt version/],
    ["path-like version", v2Plan({ promptVersion: "../manifest.v2.json" as never }), /Unknown or unapproved prompt version/],
    ["unapproved case", v2Plan({ caseId: "other-case" }), /single authorized synthetic development case/],
    ["changed profile", v2Plan({
      configuration: { ...loadedV2.manifest.ollama_configuration, timeout_ms: 1000 },
    }), /does not match the approved profile/],
  ];
  for (const [label, plan, expected] of attempts) {
    await assert.rejects(client.runVerified(plan, async () => null), expected, label);
  }
  assert.equal(requests.length, 0);
});

test("versioning: no public export reaches the generative transport or the bridge", async () => {
  const names = [...Object.keys(await import("./transport")), ...Object.keys(await import("./runner"))];
  for (const forbidden of ["createPowerShellOllamaBridge", "isOllamaWindowsTransport", "runVerifiedUnchecked"]) {
    assert.equal(names.includes(forbidden), false);
  }
  const client = createOllamaWindowsClientWithBridge(fakeOllamaBridge().bridge);
  assert.equal("transport" in client || "bridge" in client, false);
});

test("versioning: SIN V2 still rejects globalUncertainty null and accepts omission or a non-empty array", () => {
  const base = JSON.parse(validSin("Hola")) as Record<string, unknown>;
  assert.equal(validateSinV2({ ...base, globalUncertainty: null }).valid, false);
  assert.equal(validateSinV2({ ...base, globalUncertainty: [""] }).valid, false);
  assert.equal(validateSinV2(base).valid, true);
  assert.equal(validateSinV2({ ...base, globalUncertainty: ["mensaje ambiguo"] }).valid, true);
});

const B3_SCHEMA_SHA256 = "7b00af36bc3ccf5c03d81cef5526f0f016a8a8a09f0a2161661b1ddd811ca6fa";
const B4_SCHEMA_SHA256 = "2f6ad37a1105c475fb2ccf8207c5ab1630744a7ceb9d07bb61505b3593d51ae3";
const B4_MANIFEST_SHA256 = "7cd5f90f4127d11231d6d763733f063e4f6473bf2777cecf2fb0464fdad57f3a";
const loadedB3 = loadManifestAndPrompt("v2", "schema_constrained");
const loadedB4 = loadManifestAndPrompt("v2", "conditional_schema");

function b3Plan(overrides: Partial<OllamaExecutionPlan> = {}): OllamaExecutionPlan {
  return {
    ...v2Plan({ manifestSha256: loadedB3.manifestSha256, configuration: loadedB3.manifest.ollama_configuration }),
    outputMode: "schema_constrained",
    ...overrides,
  };
}

function b3Options(overrides: Record<string, unknown> = {}) {
  return {
    manifestSha256: loadedB3.manifestSha256,
    authorizeRealInference: true,
    promptVersion: "v2",
    outputMode: "schema_constrained",
    ...overrides,
  } as Parameters<typeof runOllamaEvaluation>[3];
}

function b4Plan(overrides: Partial<OllamaExecutionPlan> = {}): OllamaExecutionPlan {
  return {
    ...v2Plan({ manifestSha256: loadedB4.manifestSha256, configuration: loadedB4.manifest.ollama_configuration }),
    outputMode: "conditional_schema",
    ...overrides,
  };
}

function b4Options(overrides: Partial<Parameters<typeof runOllamaEvaluation>[3]> = {}) {
  return {
    manifestSha256: loadedB4.manifestSha256,
    authorizeRealInference: true,
    promptVersion: "v2" as const,
    outputMode: "conditional_schema" as const,
    ...overrides,
  };
}

function chatBodies(requests: OllamaBridgeRequest[]): string[] {
  return requests
    .filter((request) => new URL(request.url).pathname === "/api/chat")
    .map((request) => Buffer.from(request.bodyBase64 ?? "", "base64").toString("utf8"));
}

function chatOverrideBridge(chat: () => OllamaBridgeResult): { bridge: OllamaBridge; requests: OllamaBridgeRequest[] } {
  const inner = fakeOllamaBridge();
  const requests: OllamaBridgeRequest[] = [];
  const bridge: OllamaBridge = async (request) => {
    requests.push(request);
    return new URL(request.url).pathname === "/api/chat" ? chat() : inner.bridge(request);
  };
  return { bridge, requests };
}

test("B3: schema is derived from the canonical contract and its hash is stable", () => {
  const first = JSON.stringify(z.toJSONSchema(sinV2OutputSchema));
  const second = JSON.stringify(z.toJSONSchema(sinV2OutputSchema));
  assert.equal(first, second);
  assert.equal(sha(first), B3_SCHEMA_SHA256);
  assert.deepEqual(createApprovedOutputFormat(B3_SCHEMA_SHA256), JSON.parse(first));
  assert.equal(JSON.parse(first).$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(loadedB3.manifest.schema_sha256, B3_SCHEMA_SHA256);
});

test("B3: altered schema hashes are rejected", async () => {
  assert.throws(() => createApprovedOutputFormat("0".repeat(64)), /does not match the approved schema hash/);
  assert.throws(() => createApprovedOutputFormat(undefined), /does not match the approved schema hash/);
  const { bridge, requests } = fakeOllamaBridge();
  const altered = { ...loadedB3.manifest, schema_sha256: "0".repeat(64) };
  await assert.rejects(
    runOllamaEvaluation(altered, loadedB3.prompt, createOllamaWindowsClientWithBridge(bridge), b3Options()),
    /output mode or schema hash/,
  );
  assert.equal(requests.length, 0);
});

test("B3: historical profiles remain approved and the registry is immutable", () => {
  assert.equal(getApprovedVersion("v1").outputMode, "prompt_only");
  assert.equal(getApprovedVersion("v2").outputMode, "prompt_only");
  assert.equal(getApprovedVersion("v2", "schema_constrained").schemaSha256, B3_SCHEMA_SHA256);
  for (const [version, mode] of [["v1", "schema_constrained"], ["v2", "other"], ["v3", "prompt_only"], ["../x", "prompt_only"]]) {
    assert.throws(() => getApprovedVersion(version, mode), /Unknown or unapproved/, `${version}+${mode}`);
  }
  const profile = getApprovedVersion("v2", "schema_constrained") as unknown as Record<string, unknown>;
  assert.throws(() => { profile.schemaSha256 = "x"; }, TypeError);
  assert.equal(Object.isFrozen(profile), true);
  assert.throws(() => loadManifestAndPrompt("v1", "schema_constrained"), /Unknown or unapproved/);
});

test("B3: CLI grammar is closed", () => {
  const base = ["--mode=ollama-windows", "--authorize-real-inference"];
  assert.deepEqual(parseCliArguments([]), { mode: "simulated" });
  assert.deepEqual(parseCliArguments(base), { mode: "ollama-windows", promptVersion: "v1" });
  assert.deepEqual(parseCliArguments([...base, "--prompt-version=v2"]), { mode: "ollama-windows", promptVersion: "v2" });
  assert.deepEqual(
    parseCliArguments([...base, "--prompt-version=v2", "--output-mode=schema-constrained"]),
    { mode: "ollama-windows", promptVersion: "v2", outputMode: "schema_constrained" },
  );
  const rejected: string[][] = [
    [...base, "--prompt-version=v2", "--output-mode=json"],
    [...base, "--prompt-version=v2", "--output-mode=prompt_only"],
    [...base, "--prompt-version=v2", "--output-mode=schema-constrained", "--output-mode=schema-constrained"],
    [...base, "--prompt-version=v2", "--prompt-version=v2", "--output-mode=schema-constrained"],
    [...base, "--prompt-version=v1", "--output-mode=schema-constrained"],
    [...base, "--output-mode=schema-constrained"],
    ["--mode=ollama-windows", "--prompt-version=v2", "--output-mode=schema-constrained"],
    ["--authorize-real-inference", "--prompt-version=v2", "--output-mode=schema-constrained"],
    ["--output-mode=schema-constrained"],
    [...base, "--prompt-version=v2", "--output-mode=schema-constrained", "--format=/tmp/x.json"],
    [...base, "--prompt-version=v2", "--output-mode=../schema"],
  ];
  for (const args of rejected) assert.throws(() => parseCliArguments(args), Error, args.join(" "));
});

test("B3: the request carries exactly the generated format, once, and the transport is then revoked", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const report = await runOllamaEvaluation(loadedB3.manifest, loadedB3.prompt, client, b3Options());
  const bodies = chatBodies(requests);
  assert.equal(bodies.length, 1);
  const configuration = loadedB3.manifest.ollama_configuration;
  const expected = JSON.stringify({
    model: configuration.model.identifier,
    messages: [
      { role: "system", content: loadedB3.prompt },
      { role: "user", content: loadedB3.manifest.cases[0].message },
    ],
    stream: false,
    think: configuration.generation.think,
    options: configuration.generation.options,
    format: z.toJSONSchema(sinV2OutputSchema),
  });
  assert.equal(bodies[0], expected);
  assert.equal(report.results[0].request_http.bodyText, expected);
  assert.equal(loadedB3.prompt.includes("$schema"), false);
  assert.equal(report.output_mode, "schema_constrained");
  assert.equal(report.provenance.schema_sha256, B3_SCHEMA_SHA256);
  assert.equal(report.provenance.manifest_sha256, loadedB3.manifestSha256);
  assert.equal(report.experiment_id, "SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14-B3-SCHEMA");
  assert.equal(report.provenance.prompt_sha256, V2_HASHES.prompt);
  assert.equal(chatBodies(requests).length, 1);
});

test("B3: direct runVerified enforces the exact body, one call and revocation", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const configuration = loadedB3.manifest.ollama_configuration;
  const base = {
    method: "POST" as const,
    url: configuration.endpoint,
    headers: { "content-type": "application/json" },
  };
  const bodyWith = (format: unknown) => JSON.stringify({
    model: configuration.model.identifier,
    messages: [
      { role: "system", content: loadedB3.prompt },
      { role: "user", content: loadedB3.manifest.cases[0].message },
    ],
    stream: false,
    think: configuration.generation.think,
    options: configuration.generation.options,
    ...(format === undefined ? {} : { format }),
  });
  let leaked: EvaluationTransport | null = null;
  const results = await client.runVerified(b3Plan(), async (transport) => {
    leaked = transport;
    const withoutFormat = await transport({ ...base, bodyText: bodyWith(undefined) });
    const arbitrary = await transport({ ...base, bodyText: bodyWith({ type: "object" }) });
    const jsonMode = await transport({ ...base, bodyText: bodyWith("json") });
    const first = await transport({ ...base, bodyText: bodyWith(z.toJSONSchema(sinV2OutputSchema)) });
    const second = await transport({ ...base, bodyText: bodyWith(z.toJSONSchema(sinV2OutputSchema)) });
    return { withoutFormat, arbitrary, jsonMode, first, second };
  });
  for (const key of ["withoutFormat", "arbitrary", "jsonMode"] as const) {
    const result = results[key];
    assert.equal(result.kind === "transport_error" && result.errorCode, "ollama_request_rejected", key);
  }
  assert.equal(results.first.kind, "response");
  assert.equal(results.second.kind === "transport_error" && results.second.errorCode, "ollama_invocation_limit");
  assert.equal(chatBodies(requests).length, 1);
  const revoked = await (leaked as unknown as EvaluationTransport)({ ...base, bodyText: "{}" });
  assert.equal(revoked.kind === "transport_error" && revoked.errorCode, "ollama_transport_revoked");
  assert.equal(chatBodies(requests).length, 1);
});

test("B3: V1/V2 bodies and reports are unchanged and separate", async () => {
  for (const [version, data] of [["v1", loaded], ["v2", loadedV2]] as const) {
    const { bridge, requests } = fakeOllamaBridge();
    const report = await runOllamaEvaluation(data.manifest, data.prompt, createOllamaWindowsClientWithBridge(bridge), {
      manifestSha256: data.manifestSha256, authorizeRealInference: true, promptVersion: version,
    });
    const body = JSON.parse(chatBodies(requests)[0]) as Record<string, unknown>;
    assert.deepEqual(Object.keys(body), ["model", "messages", "stream", "think", "options"]);
    assert.equal("output_mode" in report, false);
    assert.equal("schema_sha256" in report.provenance, false);
  }
  assert.notEqual(loadedB3.manifest.experiment_id, loadedV2.manifest.experiment_id);
  assert.notEqual(loadedB3.manifestSha256, loadedV2.manifestSha256);
  assert.equal(sha(fileBytes("manifest.v2.json")), V2_HASHES.manifest);
  assert.equal(sha(fileBytes("manifest.json")), V1_HASHES.manifest);
});

test("B3: authorization, preflight, mode and format cannot be bypassed", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = () => createOllamaWindowsClientWithBridge(bridge);
  await assert.rejects(
    runOllamaEvaluation(loadedB3.manifest, loadedB3.prompt, client(), b3Options({ authorizeRealInference: undefined })),
    /Explicit real-inference authorization is required/,
  );
  await assert.rejects(
    runOllamaEvaluation(loadedB3.manifest, loadedB3.prompt, client(), b3Options({ outputMode: undefined })),
    /output mode or schema hash|manifestSha256 does not match|manifest identity/,
  );
  await assert.rejects(
    runOllamaEvaluation(loadedV2.manifest, loadedV2.prompt, client(), {
      manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true, promptVersion: "v2", outputMode: "schema_constrained",
    }),
    /manifest identity or prompt path|output mode or schema hash/,
  );
  await assert.rejects(
    runOllamaEvaluation(loaded.manifest, loaded.prompt, client(), {
      manifestSha256: loaded.manifestSha256, authorizeRealInference: true, outputMode: "schema_constrained",
    }),
    /Unknown or unapproved/,
  );
  const plans: Array<[string, OllamaExecutionPlan, RegExp]> = [
    ["caller format", { ...b3Plan(), format: { type: "object" } } as OllamaExecutionPlan, /caller-supplied output format/],
    ["unapproved mode", b3Plan({ outputMode: "json" as never }), /Unknown or unapproved/],
    ["v1 constrained", b3Plan({ promptVersion: "v1" }), /Unknown or unapproved/],
    ["B3 manifest hash under V2 plan", b3Plan({ outputMode: "prompt_only" }), /manifestSha256 does not match/],
    ["forged manifest hash", b3Plan({ manifestSha256: "a".repeat(64) }), /manifestSha256 does not match/],
    ["no authorization", b3Plan({ authorizeRealInference: false as never }), /./],
  ];
  for (const [label, plan, expected] of plans) {
    await assert.rejects(client().runVerified(plan, async () => null), expected, label);
  }
  assert.equal(requests.length, 0);
});

test("B3: HTTP errors, invalid JSON and truncation are classified without repair", async () => {
  const content = (value: string, extra: Record<string, unknown> = {}) => envelope(value, { done_reason: "stop", ...extra });
  const scenarios: Array<[string, () => OllamaBridgeResult, string]> = [
    ["http 400", () => bridgeResponse(JSON.stringify({ error: "format unsupported" }), 400), "http_error"],
    ["http 500", () => bridgeResponse("boom", 500), "http_error"],
    ["outer invalid", () => bridgeResponse("not json"), "outer_json_invalid"],
    ["sin invalid", () => bridgeResponse(content("{not json")), "sin_json_invalid"],
    ["truncated", () => bridgeResponse(content("{\"schema\":", { done_reason: "length" })), "truncated"],
    ["transport error", () => ({ kind: "transport_error", errorCode: "ollama_connection_error", durationMilliseconds: 1 }), "transport_error"],
  ];
  for (const [label, chat, classification] of scenarios) {
    const { bridge, requests } = chatOverrideBridge(chat);
    const report = await runOllamaEvaluation(
      loadedB3.manifest, loadedB3.prompt, createOllamaWindowsClientWithBridge(bridge), b3Options(),
    );
    assert.equal(report.results[0].classification, classification, label);
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].validated_output, null, label);
    assert.equal(chatBodies(requests).length, 1, label);
  }
});

test("B3: malformed output that breaks cross-field rules stays invalid", async () => {
  const schema = z.toJSONSchema(sinV2OutputSchema);
  const message = loadedB3.manifest.cases[0].message;
  const crossFieldInvalid = {
    schema: "sin-v2-experimental",
    message,
    status: "answered",
    units: [{ id: "u1", act: "ask", predicate: null }],
  };
  assert.equal(typeof schema, "object");
  assert.deepEqual(independentSchemaValidation([schema], [crossFieldInvalid]), [[false]]);
  const outcome = validateSinV2(crossFieldInvalid);
  assert.equal(outcome.valid, false);
  assert.ok(outcome.issues.some((issue) => issue.code === "schema"));
  const { bridge } = chatOverrideBridge(() => bridgeResponse(envelope(JSON.stringify(crossFieldInvalid))));
  const report = await runOllamaEvaluation(
    loadedB3.manifest, loadedB3.prompt, createOllamaWindowsClientWithBridge(bridge), b3Options(),
  );
  assert.notEqual(report.results[0].classification, "valid");
  assert.equal(report.results[0].validated_output, null);
});

function independentSchemaValidation(schemas: unknown[], instances: unknown[]): boolean[][] {
  const python = [
    "import json, sys",
    "from jsonschema import Draft202012Validator",
    "data = json.load(sys.stdin)",
    "for schema in data['schemas']:",
    "    Draft202012Validator.check_schema(schema)",
    "print(json.dumps([[Draft202012Validator(schema).is_valid(instance) for instance in data['instances']] for schema in data['schemas']]))",
  ].join("\n");
  const result = spawnSync("python3", ["-B", "-c", python], {
    input: JSON.stringify({ schemas, instances }),
    encoding: "utf8",
  });
  assert.equal(result.error, undefined, "python3 with jsonschema is required for independent validation");
  assert.equal(result.status, 0, result.stderr);
  const parsed: unknown = JSON.parse(result.stdout);
  assert.ok(Array.isArray(parsed) && parsed.length === schemas.length);
  assert.ok(parsed.every((row: unknown) =>
    Array.isArray(row) && row.length === instances.length && row.every((value: unknown) => typeof value === "boolean")));
  return parsed;
}

function predicateMatrixInstance(act: CommunicativeAct, predicate: string | null) {
  const message = "Texto literal";
  return {
    schema: "sin-v2-experimental",
    message,
    status: "complete",
    units: [{
      id: "u1",
      status: "interpreted",
      act,
      predicate,
      polarity: "neutral",
      referent: { surface: null, resolution: "absent" },
      relations: [],
      dependencies: [],
      evidence: predicate === null
        ? [{ field: "act", span: message }]
        : [{ field: "predicate", span: predicate }],
      uncertainty: [],
    }],
  };
}

test("B4 offline: projection preserves B3 and is deterministic", (t) => {
  const base = z.toJSONSchema(sinV2OutputSchema);
  const baseBytes = JSON.stringify(base);
  const first = createConditionalSchema();
  const firstBytes = JSON.stringify(first);
  const secondBytes = JSON.stringify(createConditionalSchema());

  assert.equal(sha(baseBytes), B3_SCHEMA_SHA256);
  assert.equal(JSON.stringify(base), baseBytes);
  assert.equal(JSON.stringify(z.toJSONSchema(sinV2OutputSchema)), baseBytes);
  assert.equal(firstBytes, secondBytes);
  assert.notEqual(sha(firstBytes), B3_SCHEMA_SHA256);
  const projectedUnits = first.properties?.units;
  assert.ok(projectedUnits && typeof projectedUnits === "object" && !Array.isArray(projectedUnits));
  const projectedItems = projectedUnits.items;
  assert.ok(projectedItems && typeof projectedItems === "object" && !Array.isArray(projectedItems));
  delete projectedItems.if;
  delete projectedItems.then;
  assert.deepEqual(first, base);
  assert.equal(sha(firstBytes), B4_SCHEMA_SHA256);
  assert.deepEqual(createApprovedOutputFormat(B4_SCHEMA_SHA256, "conditional_schema"), JSON.parse(firstBytes));
  t.diagnostic(`B4 experimental schema SHA-256: ${sha(firstBytes)} (inference requires separate authorization)`);
});

test("B4 offline: independent Draft 2020-12 validation agrees with predicate-required for every act", () => {
  const base = z.toJSONSchema(sinV2OutputSchema);
  const projected = createConditionalSchema();
  const requiredActs = new Set<CommunicativeAct>(["instruct", "ask", "qualify", "inform"]);
  const matrix = COMMUNICATIVE_ACTS.flatMap((act) =>
    [null, "literal"].map((predicate) => ({ act, predicate, instance: predicateMatrixInstance(act, predicate) })));
  const structurallyValidButOtherIssues = [
    { ...predicateMatrixInstance("ask", "literal"), units: [{
      ...predicateMatrixInstance("ask", "literal").units[0],
      polarity: "negative",
      evidence: [],
      status: "partial",
    }], status: "partial" },
    { ...predicateMatrixInstance("reject", null), units: [{
      ...predicateMatrixInstance("reject", null).units[0],
      polarity: "positive",
      evidence: [],
    }] },
  ];
  const instances = [...matrix.map((row) => row.instance), ...structurallyValidButOtherIssues];
  const [baseResults, projectedResults] = independentSchemaValidation([base, projected], instances);
  assert.ok(baseResults && projectedResults);

  for (const [index, row] of matrix.entries()) {
    const expectedRequired = row.predicate === null && requiredActs.has(row.act);
    const issues = validateSinV2(row.instance).issues.map((issue) => issue.code);
    assert.equal(baseResults[index], true, `${row.act}/${row.predicate}: B3`);
    assert.equal(projectedResults[index], !expectedRequired, `${row.act}/${row.predicate}: B4`);
    assert.equal(issues.includes("predicate-required"), expectedRequired, `${row.act}/${row.predicate}: canonical rule`);
    assert.deepEqual(issues, expectedRequired ? ["predicate-required"] : [], `${row.act}/${row.predicate}: other issues`);
  }
  for (const [offset, instance] of structurallyValidButOtherIssues.entries()) {
    const index = matrix.length + offset;
    assert.equal(baseResults[index], true);
    assert.equal(projectedResults[index], true);
    const issues = validateSinV2(instance).issues.map((issue) => issue.code);
    assert.equal(issues.includes("predicate-required"), false);
    assert.ok(issues.length > 0, "other canonical issues remain the validator's responsibility");
  }
});

test("B3: independently schema-valid cross-field violation remains invalid in canonical validator", async () => {
  const instance = predicateMatrixInstance("ask", null);
  const results = independentSchemaValidation([z.toJSONSchema(sinV2OutputSchema), createConditionalSchema()], [instance]);
  assert.deepEqual(results, [[true], [false]]);
  assert.deepEqual(validateSinV2(instance).issues.map((issue) => issue.code), ["predicate-required"]);
  const { bridge } = chatOverrideBridge(() => bridgeResponse(envelope(JSON.stringify(instance))));
  const report = await runOllamaEvaluation(
    loadedB3.manifest, loadedB3.prompt, createOllamaWindowsClientWithBridge(bridge), b3Options(),
  );
  assert.equal(report.results[0].classification, "schema_invalid");
  assert.deepEqual(report.results[0].validation_issues.map((issue) => issue.code), ["predicate-required"]);
  assert.equal(report.results[0].validated_output, null);
});

test("B4: four closed profiles preserve historical artifacts and bind the conditional manifest", () => {
  const b4 = getApprovedVersion("v2", "conditional_schema");
  assert.equal(sha(fileBytes("manifest.v2.conditional.json")), B4_MANIFEST_SHA256);
  assert.equal(loadedB4.manifestSha256, B4_MANIFEST_SHA256);
  assert.equal(b4.schemaSha256, B4_SCHEMA_SHA256);
  assert.equal(b4.manifestSha256, B4_MANIFEST_SHA256);
  assert.equal(Object.isFrozen(b4), true);
  const normalize = (manifest: EvaluationManifest) => ({
    ...manifest, experiment_id: "", output_mode: "", schema_sha256: "",
  });
  assert.deepEqual(normalize(loadedB4.manifest), normalize(loadedB3.manifest));
  assert.equal(sha(fileBytes("manifest.v2.schema.json")), "7d73a490f27316dd1469b6cae5d6d88c8fad6420f2522a46691349c4406a8a4e");
  assert.equal(sha(fileBytes("manifest.v2.json")), V2_HASHES.manifest);
  assert.equal(sha(fileBytes("manifest.json")), V1_HASHES.manifest);
  assert.equal(sha(fileBytes("prompt.v2.txt")), V2_HASHES.prompt);
  assert.equal(sha(fileBytes("prompt.txt")), V1_HASHES.prompt);
  for (const [version, mode] of [["v1", "conditional_schema"], ["v2", "conditional-schema"], ["v3", "conditional_schema"], ["v2", "other"]]) {
    assert.throws(() => getApprovedVersion(version, mode), /Unknown or unapproved/);
  }
  assert.throws(() => createApprovedOutputFormat("0".repeat(64), "conditional_schema"), /schema hash/);
  assert.throws(() => createApprovedOutputFormat(B3_SCHEMA_SHA256, "conditional_schema"), /schema hash/);
  assert.throws(() => createApprovedOutputFormat(B4_SCHEMA_SHA256, "schema_constrained"), /schema hash/);
  assert.throws(() => createApprovedOutputFormat(B4_SCHEMA_SHA256, "other" as never), /Unknown or unapproved/);
});

test("B4: CLI selection is closed and requires explicit V2 and authorization flags", () => {
  const flags = ["--mode=ollama-windows", "--authorize-real-inference"];
  const mode = "--output-mode=conditional-schema";
  assert.deepEqual(parseCliArguments([...flags, "--prompt-version=v2", mode]), {
    mode: "ollama-windows", promptVersion: "v2", outputMode: "conditional_schema",
  });
  for (const args of [
    [...flags, mode], [...flags, "--prompt-version=v1", mode],
    ["--mode=ollama-windows", "--prompt-version=v2", mode],
    ["--authorize-real-inference", "--prompt-version=v2", mode],
    [...flags, "--prompt-version=v2", mode, mode],
    [...flags, "--prompt-version=v2", mode, "--format=/tmp/schema"],
    [...flags, "--prompt-version=v2", "--output-mode=conditional_schema"],
  ]) {
    assert.throws(() => parseCliArguments(args), Error, args.join(" "));
  }
});

test("B4: simulated request changes only format and preserves report provenance and canonical validation", async () => {
  const { bridge: b3Bridge, requests: b3Requests } = fakeOllamaBridge();
  await runOllamaEvaluation(loadedB3.manifest, loadedB3.prompt, createOllamaWindowsClientWithBridge(b3Bridge), b3Options());
  const instance = predicateMatrixInstance("ask", null);
  const { bridge, requests } = chatOverrideBridge(() => bridgeResponse(envelope(JSON.stringify(instance))));
  const report = await runOllamaEvaluation(
    loadedB4.manifest, loadedB4.prompt, createOllamaWindowsClientWithBridge(bridge), b4Options(),
  );
  const b3Body = JSON.parse(chatBodies(b3Requests)[0]) as Record<string, unknown>;
  const b4Body = JSON.parse(chatBodies(requests)[0]) as Record<string, unknown>;
  assert.deepEqual({ ...b4Body, format: b3Body.format }, b3Body);
  assert.deepEqual(b4Body.format, createApprovedOutputFormat(B4_SCHEMA_SHA256, "conditional_schema"));
  assert.equal(chatBodies(requests).length, 1);
  assert.equal(report.results[0].request_http.bodyText, chatBodies(requests)[0]);
  assert.equal(report.results[0].http_response?.bodyText, envelope(JSON.stringify(instance)));
  assert.equal(report.results[0].raw_outer_response_text, report.results[0].http_response?.bodyText);
  assert.equal(report.results[0].classification, "schema_invalid");
  assert.deepEqual(report.results[0].validation_issues.map((issue) => issue.code), ["predicate-required"]);
  assert.equal(report.results[0].validated_output, null);
  assert.equal(report.output_mode, "conditional_schema");
  assert.equal(report.experiment_id, loadedB4.manifest.experiment_id);
  assert.equal(report.provenance.schema_sha256, B4_SCHEMA_SHA256);
  assert.equal(report.provenance.manifest_sha256, B4_MANIFEST_SHA256);
  assert.equal(report.provenance.prompt_sha256, V2_HASHES.prompt);
});

test("B4: authorization and crossed artifacts reject before simulated bridge calls", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = () => createOllamaWindowsClientWithBridge(bridge);
  await assert.rejects(runOllamaEvaluation(loadedB4.manifest, loadedB4.prompt, client(),
    b4Options({ authorizeRealInference: false })), /authorization/);
  await assert.rejects(runOllamaEvaluation(loadedB3.manifest, loadedB3.prompt, client(),
    b4Options()), /identity|output mode|hash/);
  await assert.rejects(runOllamaEvaluation(loadedB4.manifest, loadedB4.prompt, client(),
    b4Options({ outputMode: "schema_constrained" })), /identity|output mode|hash/);
  await assert.rejects(runOllamaEvaluation({ ...loadedB4.manifest, schema_sha256: "0".repeat(64) },
    loadedB4.prompt, client(), b4Options()), /output mode or schema hash/);
  for (const plan of [
    b4Plan({ authorizeRealInference: false as never }),
    b4Plan({ promptVersion: "v1" }),
    b4Plan({ outputMode: "schema_constrained" }),
    b4Plan({ manifestSha256: loadedB3.manifestSha256 }),
    b4Plan({ manifestSha256: "0".repeat(64) }),
    b4Plan({ prompt: `${loadedB4.prompt} ` }),
    b4Plan({ caseMessage: "not the approved case" }),
    b4Plan({ configuration: { ...loadedB4.manifest.ollama_configuration, timeout_ms: 1 } }),
    { ...b4Plan(), format: createConditionalSchema() } as OllamaExecutionPlan,
  ]) {
    await assert.rejects(client().runVerified(plan, async () => null), Error);
  }
  assert.equal(requests.length, 0);
});

test("B4: simulated preflight rejects a mismatched model before generation", async () => {
  const { bridge, requests } = fakeOllamaBridge({ digest: "0".repeat(64) });
  await assert.rejects(runOllamaEvaluation(
    loadedB4.manifest, loadedB4.prompt, createOllamaWindowsClientWithBridge(bridge), b4Options(),
  ), /tag or digest does not match/);
  assert.deepEqual(requests.map((request) => new URL(request.url).pathname), ["/api/version", "/api/tags"]);
});

test("B4: simulated valid SIN output remains valid and is retained without repair", async () => {
  const content = validSin(loadedB4.manifest.cases[0].message);
  const { bridge, requests } = chatOverrideBridge(() => bridgeResponse(envelope(content)));
  const report = await runOllamaEvaluation(
    loadedB4.manifest, loadedB4.prompt, createOllamaWindowsClientWithBridge(bridge), b4Options(),
  );
  assert.equal(report.results[0].classification, "valid");
  assert.equal(report.results[0].sin_content_text, content);
  assert.deepEqual(report.results[0].validated_output, JSON.parse(content));
  assert.deepEqual(report.results[0].validation_issues, []);
  assert.equal(chatBodies(requests).length, 1);
});

test("B4: direct runVerified rejects arbitrary formats and enforces one call and revocation", async () => {
  const { bridge, requests } = fakeOllamaBridge();
  const client = createOllamaWindowsClientWithBridge(bridge);
  const configuration = loadedB4.manifest.ollama_configuration;
  const request = {
    method: "POST" as const,
    url: configuration.endpoint,
    headers: { "content-type": "application/json" },
  };
  const body = (format: unknown) => JSON.stringify({
    model: configuration.model.identifier,
    messages: [
      { role: "system", content: loadedB4.prompt },
      { role: "user", content: loadedB4.manifest.cases[0].message },
    ],
    stream: false, think: configuration.generation.think, options: configuration.generation.options, format,
  });
  let retained: EvaluationTransport | undefined;
  const results = await client.runVerified(b4Plan(), async (transport) => {
    retained = transport;
    return {
      b3: await transport({ ...request, bodyText: body(z.toJSONSchema(sinV2OutputSchema)) }),
      arbitrary: await transport({ ...request, bodyText: body({ type: "object" }) }),
      approved: await transport({ ...request, bodyText: body(createConditionalSchema()) }),
      again: await transport({ ...request, bodyText: body(createConditionalSchema()) }),
    };
  });
  assert.equal(results.b3.kind === "transport_error" && results.b3.errorCode, "ollama_request_rejected");
  assert.equal(results.arbitrary.kind === "transport_error" && results.arbitrary.errorCode, "ollama_request_rejected");
  assert.equal(results.approved.kind, "response");
  assert.equal(results.again.kind === "transport_error" && results.again.errorCode, "ollama_invocation_limit");
  assert.ok(retained);
  const revoked = await retained({ ...request, bodyText: body(createConditionalSchema()) });
  assert.equal(revoked.kind === "transport_error" && revoked.errorCode, "ollama_transport_revoked");
  assert.equal(chatBodies(requests).length, 1);
});

test("B3: structural fake clients and new exports do not reach generation", async () => {
  const fake = { runVerified: async () => null, timeoutMs: 180000, bridgeOrigin: "injected" } as unknown as OllamaWindowsClient;
  await assert.rejects(
    runOllamaEvaluation(loadedB3.manifest, loadedB3.prompt, fake, b3Options()),
    /created by createOllamaWindowsClient/,
  );
  const names = [...Object.keys(await import("./transport")), ...Object.keys(await import("./runner"))];
  for (const forbidden of ["createPowerShellOllamaBridge", "isOllamaWindowsTransport", "runVerifiedUnchecked", "buildHttpRequest"]) {
    assert.equal(names.includes(forbidden), false);
  }
});

const B4_015_MANIFEST_SHA256 = "2b9404a83063c84f67bc693466052758e878a75ae0d5b91abd8b3587eb9a4b46";
const loadedB4_015 = loadManifestAndPrompt("v2", "conditional_schema", "b4-015");

function b4_015Options(overrides: Partial<Parameters<typeof runOllamaEvaluation>[3]> = {}) {
  return {
    manifestSha256: loadedB4_015.manifestSha256,
    authorizeRealInference: true,
    promptVersion: "v2" as const,
    outputMode: "conditional_schema" as const,
    runtimeVariant: "b4-015" as const,
    ...overrides,
  };
}

function b4_015Plan(overrides: Partial<OllamaExecutionPlan> = {}): OllamaExecutionPlan {
  return b4Plan({
    runtimeVariant: "b4-015",
    configuration: loadedB4_015.manifest.ollama_configuration,
    manifestSha256: loadedB4_015.manifestSha256,
    ...overrides,
  });
}

test("B4-015: five closed profiles and strict manifest differences", () => {
  const expected = getApprovedVersion("v2", "conditional_schema", "b4-015");
  assert.equal(expected.manifestFile, "manifest.v2.conditional.ollama-015.json");
  assert.equal(expected.manifestSha256, B4_015_MANIFEST_SHA256);
  assert.equal(sha(fileBytes(expected.manifestFile)), B4_015_MANIFEST_SHA256);
  assert.equal(expected.schemaSha256, B4_SCHEMA_SHA256);
  assert.equal(expected.profile.expected_version, "0.40.15");
  assert.equal(Object.isFrozen(expected.profile), true);
  const normalized = {
    ...loadedB4_015.manifest,
    experiment_id: loadedB4.manifest.experiment_id,
    ollama_configuration: {
      ...loadedB4_015.manifest.ollama_configuration,
      expected_version: loadedB4.manifest.ollama_configuration.expected_version,
    },
  };
  assert.deepEqual(normalized, loadedB4.manifest);
  for (const [version, mode] of [
    ["v1", "prompt_only"], ["v2", "prompt_only"], ["v2", "schema_constrained"],
  ]) {
    assert.throws(() => getApprovedVersion(version, mode, "b4-015"), /Unknown or unapproved/);
  }
  for (const variant of ["0.40.15", "../manifest.json", "", null, "b4-016"]) {
    assert.throws(() => getApprovedVersion("v2", "conditional_schema", variant), /Unknown or unapproved/);
  }
});

test("B4-015: CLI selector is explicit and closed", () => {
  const flags = ["--mode=ollama-windows", "--authorize-real-inference"];
  const v2 = "--prompt-version=v2";
  const mode = "--output-mode=conditional-schema";
  const variant = "--runtime-variant=b4-015";
  assert.deepEqual(parseCliArguments([...flags, v2, mode, variant]), {
    mode: "ollama-windows", promptVersion: "v2", outputMode: "conditional_schema", runtimeVariant: "b4-015",
  });
  for (const args of [
    [...flags, v2, mode, variant, variant],
    [...flags, v2, mode, "--runtime-variant=0.40.15"],
    [...flags, "--prompt-version=v1", mode, variant],
    [...flags, v2, variant],
    [...flags, v2, "--output-mode=schema-constrained", variant],
    [...flags, mode, variant],
    ["--mode=ollama-windows", v2, mode, variant],
    ["--authorize-real-inference", v2, mode, variant],
    [...flags, v2, mode, variant, "--manifest=/tmp/manifest.json"],
  ]) assert.throws(() => parseCliArguments(args), Error, args.join(" "));
});

test("B4-015: simulated request matches B4 and historical preflights remain version-bound", async () => {
  const historic = [
    { data: loaded, options: authorizedOptions },
    { data: loadedV2, options: { manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true, promptVersion: "v2" as const } },
    { data: loadedB3, options: b3Options() },
    { data: loadedB4, options: b4Options() },
  ];
  let b4Body = "";
  for (const { data, options } of historic) {
    const fake = fakeOllamaBridge();
    const report = await runOllamaEvaluation(data.manifest, data.prompt, createOllamaWindowsClientWithBridge(fake.bridge), options);
    assert.equal(report.preflight_model_metadata.version, "0.40.14");
    assert.equal(report.results[0].classification, "valid");
    assert.equal(chatCalls(fake.requests), 1);
    if (data === loadedB4) b4Body = chatBodies(fake.requests)[0];
  }
  const fake = fakeOllamaBridge({ version: "0.40.15" });
  const report = await runOllamaEvaluation(
    loadedB4_015.manifest, loadedB4_015.prompt, createOllamaWindowsClientWithBridge(fake.bridge), b4_015Options(),
  );
  assert.equal(chatBodies(fake.requests)[0], b4Body);
  assert.equal(report.results[0].request_http.bodyText, b4Body);
  assert.equal(report.results[0].classification, "valid");
  assert.equal(report.preflight_model_metadata.version, "0.40.15");
  assert.equal(report.experiment_id, loadedB4_015.manifest.experiment_id);
  assert.equal(report.provenance.manifest_sha256, B4_015_MANIFEST_SHA256);
  assert.equal(report.provenance.schema_sha256, B4_SCHEMA_SHA256);
  assert.equal(report.results[0].raw_outer_response_text, report.results[0].http_response?.bodyText);
  assert.equal(chatCalls(fake.requests), 1);
});

test("B4-015: wrong preflight version, model, digest and think never generate", async () => {
  for (const overrides of [
    { version: "0.40.14" }, { version: "0.40.16" },
    { version: "0.40.15", model: "other" },
    { version: "0.40.15", digest: "0".repeat(64) },
    { version: "0.40.15", thinkingValues: [true] },
  ]) {
    const fake = fakeOllamaBridge(overrides);
    await assert.rejects(runOllamaEvaluation(
      loadedB4_015.manifest, loadedB4_015.prompt, createOllamaWindowsClientWithBridge(fake.bridge), b4_015Options(),
    ));
    assert.equal(chatCalls(fake.requests), 0);
  }
  for (const { data, options } of [
    { data: loaded, options: authorizedOptions },
    { data: loadedV2, options: { manifestSha256: loadedV2.manifestSha256, authorizeRealInference: true, promptVersion: "v2" as const } },
    { data: loadedB3, options: b3Options() },
    { data: loadedB4, options: b4Options() },
  ]) {
    const wrongVersion = fakeOllamaBridge({ version: "0.40.15" });
    await assert.rejects(runOllamaEvaluation(
      data.manifest, data.prompt, createOllamaWindowsClientWithBridge(wrongVersion.bridge), options,
    ), /version does not match/);
    assert.equal(chatCalls(wrongVersion.requests), 0);
  }
});

test("B4-015: crossed plans, altered artifacts and authorization fail before bridge", async () => {
  const fake = fakeOllamaBridge({ version: "0.40.15" });
  const client = createOllamaWindowsClientWithBridge(fake.bridge);
  const invalidPlans: OllamaExecutionPlan[] = [
    b4_015Plan({ authorizeRealInference: false as never }),
    b4_015Plan({ runtimeVariant: undefined }),
    b4_015Plan({ runtimeVariant: "other" as never }),
    b4_015Plan({ promptVersion: "v1" }),
    b4_015Plan({ outputMode: "schema_constrained" }),
    b4_015Plan({ manifestSha256: loadedB4.manifestSha256 }),
    b4_015Plan({ manifestSha256: "0".repeat(64) }),
    b4_015Plan({ configuration: loadedB4.manifest.ollama_configuration }),
    b4_015Plan({ prompt: `${loadedB4_015.prompt} ` }),
    b4_015Plan({ caseMessage: "different" }),
    { ...b4_015Plan(), format: createConditionalSchema() } as OllamaExecutionPlan,
    b4Plan({ runtimeVariant: "b4-015" }),
  ];
  for (const plan of invalidPlans) await assert.rejects(client.runVerified(plan, async () => null));
  await assert.rejects(runOllamaEvaluation(
    loadedB4_015.manifest, loadedB4_015.prompt, client, b4_015Options({ authorizeRealInference: false }),
  ));
  await assert.rejects(runOllamaEvaluation(
    loadedB4.manifest, loadedB4.prompt, client, b4_015Options(),
  ));
  await assert.rejects(runOllamaEvaluation(
    { ...loadedB4_015.manifest, schema_sha256: "0".repeat(64) }, loadedB4_015.prompt, client, b4_015Options(),
  ));
  assert.equal(fake.requests.length, 0);
});

test("B4-015: one invocation, exact body and revocation also hold for direct public API", async () => {
  const fake = fakeOllamaBridge({ version: "0.40.15" });
  const client = createOllamaWindowsClientWithBridge(fake.bridge);
  const request: HttpRequestCapture = {
    method: "POST",
    url: loadedB4_015.manifest.ollama_configuration.endpoint,
    headers: { "content-type": "application/json" },
    bodyText: JSON.stringify({
      model: loadedB4_015.manifest.ollama_configuration.model.identifier,
      messages: [
        { role: "system", content: loadedB4_015.prompt },
        { role: "user", content: loadedB4_015.manifest.cases[0].message },
      ],
      stream: false,
      think: false,
      options: loadedB4_015.manifest.ollama_configuration.generation.options,
      format: createApprovedOutputFormat(B4_SCHEMA_SHA256, "conditional_schema"),
    }),
  };
  let escaped: EvaluationTransport | undefined;
  await client.runVerified(b4_015Plan(), async (transport) => {
    escaped = transport;
    const bad = await transport({ ...request, bodyText: `${request.bodyText} ` });
    assert.equal(bad.kind === "transport_error" && bad.errorCode, "ollama_request_rejected");
    assert.equal((await transport(request)).kind, "response");
    const duplicate = await transport(request);
    assert.equal(duplicate.kind === "transport_error" && duplicate.errorCode, "ollama_invocation_limit");
  });
  assert.ok(escaped);
  const revoked = await escaped(request);
  assert.equal(revoked.kind === "transport_error" && revoked.errorCode, "ollama_transport_revoked");
  assert.equal(chatCalls(fake.requests), 1);
  assert.equal("transport" in client || "bridge" in client, false);
});

test("B4-015: canonical issues and unmodified response are retained", async () => {
  const instance = predicateMatrixInstance("ask", null);
  const content = JSON.stringify(instance);
  const diagnostics = fakeOllamaBridge({ version: "0.40.15" });
  const bridge: OllamaBridge = async (request) => new URL(request.url).pathname === "/api/chat"
    ? bridgeResponse(envelope(content)) : diagnostics.bridge(request);
  const report = await runOllamaEvaluation(
    loadedB4_015.manifest, loadedB4_015.prompt, createOllamaWindowsClientWithBridge(bridge), b4_015Options(),
  );
  assert.equal(report.results[0].sin_content_text, content);
  assert.equal(report.results[0].classification, "schema_invalid");
  assert.deepEqual(report.results[0].validation_issues.map((issue) => issue.code), ["predicate-required"]);
  assert.equal(report.results[0].validated_output, null);
});

// Path: test/unit/llm.retryPolicy.spec.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatOpenAI } from "@langchain/openai";
import {
  applyLlmRetryPolicy,
  classifyLlmRetryError,
} from "@/lib/llm/retryPolicy";

type ProviderErrorFields = {
  status?: number;
  code?: string;
  type?: string;
  error?: { code?: string; type?: string; message?: string };
  headers?: Record<string, string>;
};

function providerError(message: string, fields: ProviderErrorFields = {}): Error & ProviderErrorFields {
  return Object.assign(new Error(message), fields);
}

async function runThroughInstalledLangChainRetry(error: Error & ProviderErrorFields) {
  const model = applyLlmRetryPolicy(new ChatOpenAI({
    apiKey: "test-key-not-used",
    maxRetries: 6,
  }));
  let attempts = 0;
  const startedAt = Date.now();
  const settled = model.caller.call(async () => {
    attempts += 1;
    throw error;
  }).catch((caught) => caught);

  await vi.runAllTimersAsync();
  return { attempts, durationMs: Date.now() - startedAt, error: await settled };
}

describe("canonical LLM retry policy", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["structured root code", providerError("quota", { status: 429, code: "insufficient_quota" })],
    ["structured nested code", providerError("quota", { status: 429, error: { code: "insufficient_quota" } })],
    ["no credits remaining", providerError("No credits remaining", { status: 429 })],
    ["add credits", providerError("Please add credits to continue", { status: 429 })],
  ])("stops installed AsyncCaller/p-retry after one attempt for %s", async (_label, error) => {
    vi.useFakeTimers();

    const result = await runThroughInstalledLangChainRetry(error);

    expect(result.attempts).toBe(1);
    expect(result.durationMs).toBe(0);
    expect(result.error).toBe(error);
    expect(classifyLlmRetryError(error)).toMatchObject({
      retryable: false,
      reason: "quota_or_billing_exhausted",
      status: 429,
    });
  });

  it.each([
    ["generic 429", providerError("Rate limit reached", { status: 429, code: "rate_limit_exceeded" })],
    ["429 with Retry-After", providerError("Too many requests", { status: 429, headers: { "retry-after": "1" } })],
    ["transient 5xx", providerError("Service unavailable", { status: 503 })],
    ["recoverable network error", providerError("Network request failed")],
  ])("preserves all seven installed retries for %s", async (_label, error) => {
    vi.useFakeTimers();

    const result = await runThroughInstalledLangChainRetry(error);

    expect(result.attempts).toBe(7);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.error).toBe(error);
    expect(classifyLlmRetryError(error)).toMatchObject({
      retryable: true,
      reason: "transient_or_unknown",
    });
  });

  it("prefers structured transient evidence over ambiguous status-only classification", () => {
    expect(classifyLlmRetryError(providerError("Too many requests", {
      status: 429,
      code: "rate_limit_exceeded",
    }))).toEqual({ retryable: true, reason: "transient_or_unknown", status: 429 });
  });
});

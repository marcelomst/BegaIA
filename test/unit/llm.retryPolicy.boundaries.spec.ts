// Path: test/unit/llm.retryPolicy.boundaries.spec.ts

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const providerState = vi.hoisted(() => ({
  attempts: 0,
  error: null as Error | null,
}));

vi.mock("@langchain/openai", async () => {
  const { AsyncCaller } = await vi.importActual<typeof import("@langchain/core/utils/async_caller")>(
    "@langchain/core/utils/async_caller"
  );

  class TestChatOpenAI {
    caller = new AsyncCaller({ maxRetries: 6 });

    private async providerCall() {
      providerState.attempts += 1;
      if (providerState.error) throw providerState.error;
      return {
        content: "{\"guestName\":\"Ana Gomez\",\"roomType\":\"double\",\"guests\":2,\"checkIn\":\"2027-01-10\",\"checkOut\":\"2027-01-12\",\"locale\":\"es\"}",
        answer: "Respuesta estructurada",
        intent: "general_question",
        entities: {},
        actions: [{ type: "no_action", detail: "none" }],
        handoff: false,
        missing_fields: [],
        language: "es",
      };
    }

    invoke() {
      return this.caller.call(() => this.providerCall());
    }

    withStructuredOutput() {
      return { invoke: () => this.caller.call(() => this.providerCall()) };
    }
  }

  return { ChatOpenAI: TestChatOpenAI };
});

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ hotelName: "Hotel Test", country: "UY" })),
}));

let fillSlotsWithLLM: typeof import("@/lib/agents/reservations").fillSlotsWithLLM;
let tryStructuredAnalyze: typeof import("@/lib/handlers/messageHandler").tryStructuredAnalyze;

function quotaError(message = "No credits remaining") {
  return Object.assign(new Error(message), { status: 429 });
}

function transient429() {
  return Object.assign(new Error("Rate limit reached"), {
    status: 429,
    code: "rate_limit_exceeded",
    headers: { "retry-after": "1" },
  });
}

async function settleWithAllRetryTimers<T>(promise: Promise<T>) {
  const settled = promise.then(
    (value) => ({ value, error: undefined }),
    (error) => ({ value: undefined, error })
  );
  await vi.runAllTimersAsync();
  return settled;
}

describe("LAT-01 retry policy at both authorized LLM boundaries", () => {
  beforeAll(async () => {
    vi.stubEnv("FORCE_GENERATION", "1");
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-used");
    ({ fillSlotsWithLLM } = await import("@/lib/agents/reservations"));
    ({ tryStructuredAnalyze } = await import("@/lib/handlers/messageHandler"));
  });

  beforeEach(() => {
    providerState.attempts = 0;
    providerState.error = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("fillSlotsWithLLM stops permanent credit failure before a second provider call", async () => {
    providerState.error = quotaError();

    const result = await settleWithAllRetryTimers(fillSlotsWithLLM("quiero reservar", "es"));

    expect(providerState.attempts).toBe(1);
    expect(result.error).toBe(providerState.error);
  });

  it("fillSlotsWithLLM preserves transient 429 retries", async () => {
    providerState.error = transient429();

    const result = await settleWithAllRetryTimers(fillSlotsWithLLM("quiero reservar", "es"));

    expect(providerState.attempts).toBe(7);
    expect(result.error).toBe(providerState.error);
  });

  it("tryStructuredAnalyze stops permanent credit failure and preserves its null fallback", async () => {
    providerState.error = quotaError("Please add credits to continue");

    const result = await settleWithAllRetryTimers(tryStructuredAnalyze({
      hotelId: "hotel999",
      lang: "es",
      channel: "web",
      userQuery: "consulta",
    }));

    expect(providerState.attempts).toBe(1);
    expect(result.error).toBeUndefined();
    expect(result.value).toBeNull();
  });

  it("tryStructuredAnalyze preserves transient 429 retries and its null fallback", async () => {
    providerState.error = transient429();

    const result = await settleWithAllRetryTimers(tryStructuredAnalyze({
      hotelId: "hotel999",
      lang: "es",
      channel: "web",
      userQuery: "consulta",
    }));

    expect(providerState.attempts).toBe(7);
    expect(result.error).toBeUndefined();
    expect(result.value).toBeNull();
  });
});

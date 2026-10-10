// Path: lib/llm/retryPolicy.ts

type ErrorRecord = Record<string, unknown>;

export type LlmRetryClassification =
  | { retryable: false; reason: "quota_or_billing_exhausted"; status?: number }
  | { retryable: true; reason: "transient_or_unknown"; status?: number };

type RetryCaller = {
  onFailedAttempt?: (error: unknown) => unknown;
  __begasistQuotaPolicyInstalled?: boolean;
};

type ModelWithCaller = {
  caller?: unknown;
};

const PERMANENT_CODES = new Set([
  "insufficient_quota",
  "insufficient_credits",
  "billing_hard_limit_reached",
  "billing_limit_reached",
  "billing_not_active",
  "credit_balance_exhausted",
  "credits_exhausted",
  "payment_required",
]);

const PERMANENT_MESSAGE_PATTERNS = [
  /\b(?:no|zero)\s+(?:api\s+)?credits?\s+(?:remaining|left|available)\b/i,
  /\b(?:add|buy|purchase|top\s*up)\s+(?:more\s+)?credits?\b/i,
  /\binsufficient[\s_-]+(?:quota|credits?)\b/i,
  /\b(?:credit|account)\s+balance\s+(?:is\s+)?(?:empty|exhausted|depleted)\b/i,
  /\b(?:billing|payment)\s+(?:is\s+)?(?:required|inactive|disabled)\b/i,
  /\b(?:billing|monthly)\s+(?:hard\s+)?(?:spend|usage)?\s*limit\s+(?:has\s+been\s+)?(?:reached|exceeded)\b/i,
];

function asRecord(value: unknown): ErrorRecord | undefined {
  return typeof value === "object" && value !== null ? value as ErrorRecord : undefined;
}

function normalizeCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return normalized || undefined;
}

function numericStatus(value: unknown): number | undefined {
  const status = typeof value === "number" ? value : Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function evidenceRecords(error: unknown): ErrorRecord[] {
  const root = asRecord(error);
  if (!root) return [];

  const response = asRecord(root.response);
  const responseData = asRecord(response?.data);
  const cause = asRecord(root.cause);
  return [
    root,
    asRecord(root.error),
    cause,
    asRecord(cause?.error),
    response,
    responseData,
    asRecord(responseData?.error),
  ].filter((record): record is ErrorRecord => Boolean(record));
}

export function classifyLlmRetryError(error: unknown): LlmRetryClassification {
  const records = evidenceRecords(error);
  const status = records
    .map((record) => numericStatus(record.status ?? record.statusCode))
    .find((value): value is number => value !== undefined);

  const codes = records.flatMap((record) => [
    normalizeCode(record.code),
    normalizeCode(record.type),
    normalizeCode(record.errorCode),
    normalizeCode(record.errorType),
  ]).filter((value): value is string => Boolean(value));

  if (codes.some((code) => PERMANENT_CODES.has(code))) {
    return { retryable: false, reason: "quota_or_billing_exhausted", status };
  }

  const messages = records
    .map((record) => record.message)
    .filter((message): message is string => typeof message === "string")
    .map((message) => message.slice(0, 2_000));

  if (messages.some((message) => PERMANENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message)))) {
    return { retryable: false, reason: "quota_or_billing_exhausted", status };
  }

  return { retryable: true, reason: "transient_or_unknown", status };
}

export function applyLlmRetryPolicy<T extends ModelWithCaller>(model: T): T {
  const caller = asRecord(model.caller) as RetryCaller | undefined;
  // Lightweight test doubles do not implement LangChain's AsyncCaller.
  if (!caller || typeof caller.onFailedAttempt !== "function" || caller.__begasistQuotaPolicyInstalled) {
    return model;
  }

  const langChainHandler = caller.onFailedAttempt.bind(caller);
  caller.onFailedAttempt = (error: unknown) => {
    if (!classifyLlmRetryError(error).retryable) {
      throw error;
    }
    return langChainHandler(error);
  };
  caller.__begasistQuotaPolicyInstalled = true;
  return model;
}

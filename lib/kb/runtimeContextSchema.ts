// Runtime context contract (M1)
// Purpose: define dynamic keys that are not sourced from hotel_config.

export type RuntimeValueType =
  | "string"
  | "markdown"
  | "boolean"
  | "number"
  | "string[]";

export type RuntimeFieldSpec = {
  type: RuntimeValueType;
  required: boolean;
  description: string;
};

export type RuntimeSchema = Record<string, RuntimeFieldSpec>;

// promptKey -> runtime schema
// Initial scope (M1): tourist events prompts only.
export const RUNTIME_SCHEMA_BY_PROMPT_KEY: Record<string, RuntimeSchema> = {
  tourist_events: {
    title: {
      type: "string",
      required: false,
      description: "Event block title shown in the template.",
    },
    rangeText: {
      type: "string",
      required: false,
      description: "Human-readable date range.",
    },
    eventsBlock: {
      type: "markdown",
      required: false,
      description: "Rendered events list/body.",
    },
    questionBlock: {
      type: "string",
      required: false,
      description: "Closing question/call-to-action.",
    },
  },
  tourist_events_img: {
    title: {
      type: "string",
      required: false,
      description: "Event block title shown in the template.",
    },
    rangeText: {
      type: "string",
      required: false,
      description: "Human-readable date range.",
    },
    eventsBlock: {
      type: "markdown",
      required: false,
      description: "Rendered events list/body.",
    },
    questionBlock: {
      type: "string",
      required: false,
      description: "Closing question/call-to-action.",
    },
  },
  contact_channel_selector: {
    channel: {
      type: "string",
      required: false,
      description: "Requested or preferred channel (web/whatsapp/email).",
    },
    channelAvailability: {
      type: "string",
      required: false,
      description: "Availability status for the requested channel.",
    },
    escalationPolicy: {
      type: "string",
      required: false,
      description: "Escalation guideline when channel is unavailable or outside service hours.",
    },
    suggestedAction: {
      type: "string",
      required: false,
      description: "Suggested next step for the guest.",
    },
  },
};

export function getRuntimeSchema(promptKey: string): RuntimeSchema | null {
  return RUNTIME_SCHEMA_BY_PROMPT_KEY[promptKey] || null;
}

export function listRuntimeKeys(promptKey: string): string[] {
  const schema = getRuntimeSchema(promptKey);
  if (!schema) return [];
  return Object.keys(schema);
}

export function validateRuntimeContext(
  promptKey: string,
  runtimeCtx: unknown
): { missingRequired: string[]; unknownKeys: string[] } {
  const schema = getRuntimeSchema(promptKey);
  if (!schema) return { missingRequired: [], unknownKeys: [] };

  const obj =
    runtimeCtx && typeof runtimeCtx === "object"
      ? (runtimeCtx as Record<string, unknown>)
      : {};

  const missingRequired = Object.entries(schema)
    .filter(([, spec]) => spec.required)
    .map(([k]) => k)
    .filter((k) => obj[k] == null || obj[k] === "");

  const allowed = new Set(Object.keys(schema));
  const unknownKeys = Object.keys(obj).filter((k) => !allowed.has(k));

  return { missingRequired, unknownKeys };
}

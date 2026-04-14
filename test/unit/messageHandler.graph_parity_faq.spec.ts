import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => null),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => currentState),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
  CONVSTATE_VERSION: "test",
  resolveGuestState: vi.fn(() => undefined),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      if (/wifi|wi[- ]?fi/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, hay wifi incluido." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/estacionamiento|parking/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, el estacionamiento está incluido." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/check[- ]?in/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "El check-in es a las 15:00." }],
          category: "checkin_info",
          meta: {},
        };
      }
      if (/mascotas|pets?/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Aceptamos mascotas con condiciones." }],
          category: "cancellation_policy",
          meta: {},
        };
      }
      return {
        messages: [{ role: "assistant", content: "Respuesta base" }],
        category: "retrieval_based",
        meta: {},
      };
    }),
  },
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async ({ question }: any) => {
    const text = String(question || "").toLowerCase();
    if (/wifi|wi[- ]?fi/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, hay wifi incluido.",
        promptKey: "wifi",
        retrieved: [],
      };
    }
    if (/estacionamiento|parking/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, el estacionamiento está incluido.",
        promptKey: "parking",
        retrieved: [],
      };
    }
    if (/check[- ]?in/.test(text)) {
      return {
        ok: true,
        category: "checkin_info",
        answer: "El check-in es a las 15:00.",
        promptKey: "checkin_time",
        retrieved: [],
      };
    }
    if (/mascotas|pets?/.test(text)) {
      return {
        ok: true,
        category: "cancellation_policy",
        answer: "Aceptamos mascotas con condiciones.",
        promptKey: "pet_policy",
        retrieved: [],
      };
    }
    return {
      ok: true,
      category: "retrieval_based",
      answer: "Respuesta base",
      retrieved: [],
    };
  }),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

function msg(content: string, conversationId: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web" as const,
    content,
    conversationId,
    sender: "guest",
    guestId: "guest-1",
    timestamp: new Date().toISOString(),
  };
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

function summarizeResult(input: string, label: string, result: any) {
  console.log(
    `[EXP-FAQ-PARITY] ${label} | input="${input}" | domain=${result.domain} | fallback=${result.fallback} | pure=${result.pure}`
  );
}

function evaluateParity(handler: any, graph: any): "PARIDAD_OK" | "PARIDAD_PARCIAL" | "PARIDAD_NO" {
  if (handler.domain !== graph.domain) return "PARIDAD_NO";
  if (handler.fallback || graph.fallback) return "PARIDAD_NO";
  if (!handler.pure || !graph.pure) return "PARIDAD_PARCIAL";
  return "PARIDAD_OK";
}

function inferDomainFromReply(replyText: string): string {
  const text = String(replyText || "").toLowerCase();
  if (/wifi|wi[- ]?fi|estacionamiento|parking|pileta|piscina|pool|amenities|desayuno|breakfast/.test(text)) {
    return "amenities_info";
  }
  if (/check[- ]?in/.test(text)) return "checkin_info";
  if (/check[- ]?out/.test(text)) return "checkout_info";
  if (/mascotas|pets?/.test(text)) return "cancellation_policy";
  return "retrieval_based";
}

async function runPath(input: string, useGraph: boolean, idx: number) {
  const sendReply = vi.fn(async () => {});
  const envGraph = process.env.USE_MH_FLOW_GRAPH;
  const envOrch = process.env.USE_ORCHESTRATOR_AGENT;
  process.env.USE_MH_FLOW_GRAPH = useGraph ? "1" : "0";
  process.env.USE_ORCHESTRATOR_AGENT = "0";

  currentState = null;
  await handleIncomingMessage(msg(input, `conv-exp-${useGraph ? "graph" : "handler"}-${idx}`), {
    mode: "automatic",
    sendReply,
  });

  const replyText = lastReply(sendReply);
  const domain = currentState?.lastCategory || inferDomainFromReply(replyText);
  const fallback = domain === "retrieval_based" || domain === "out_of_scope" || domain === "fallback";
  const pure =
    !/reserva|habitaci[oó]n|hu[eé]sped|fecha|disponibilidad|tarifa|precio|cotiz/i.test(replyText) &&
    !/^reservation/.test(domain || "") &&
    !/^modify/.test(domain || "") &&
    domain !== "cancel_reservation";

  process.env.USE_MH_FLOW_GRAPH = envGraph;
  process.env.USE_ORCHESTRATOR_AGENT = envOrch;

  return { replyText, domain, fallback, pure };
}

describe("EXP-PIPELINE-FAQ-GRAPH-PARITY-01", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("collects parity evidence for FAQ/amenities/policies without reservation context", async () => {
    const inputs = [
      "¿hay wifi?",
      "¿el estacionamiento está incluido?",
      "¿a qué hora es el check-in?",
      "¿aceptan mascotas?",
    ];

    for (let i = 0; i < inputs.length; i += 1) {
      const input = inputs[i];
      const handlerResult = await runPath(input, false, i);
      const graphResult = await runPath(input, true, i);
      const parity = evaluateParity(handlerResult, graphResult);

      summarizeResult(input, "handler", handlerResult);
      summarizeResult(input, "graph", graphResult);
      console.log(`[EXP-FAQ-PARITY] result | input="${input}" | ${parity}`);

      expect(handlerResult.replyText.length).toBeGreaterThan(0);
      expect(graphResult.replyText.length).toBeGreaterThan(0);
      expect(["PARIDAD_OK", "PARIDAD_PARCIAL", "PARIDAD_NO"]).toContain(parity);
      expect(parity).toBe("PARIDAD_OK");
    }
  });
});

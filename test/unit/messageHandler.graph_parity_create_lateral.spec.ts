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
      return {
        messages: [{ role: "assistant", content: "Respuesta base" }],
        category: "reservation",
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
    channel: "web",
    content,
    conversationId,
    sender: "guest",
    guestId: "guest-1",
  };
}

function lastReply(sendReply: any, idx = -1): string {
  return String(sendReply.mock.calls.at(idx)?.[0] || "");
}

function summarizeResult(label: string, result: any) {
  console.log(
    `[EXP-CREATE-LATERAL] ${label} | domain=${result.domain} | fallback=${result.fallback} | pure=${result.pure} | create_continuity=${result.createContinuity}`
  );
}

function evaluateParity(handler: any, graph: any): "PARIDAD_OK" | "PARIDAD_PARCIAL" | "PARIDAD_NO" {
  if (handler.domain !== graph.domain) return "PARIDAD_NO";
  if (handler.fallback || graph.fallback) return "PARIDAD_NO";
  if (!handler.pure || !graph.pure) return "PARIDAD_PARCIAL";
  if (!handler.createContinuity || !graph.createContinuity) return "PARIDAD_PARCIAL";
  return "PARIDAD_OK";
}

function inferDomainFromReply(replyText: string): string {
  const text = String(replyText || "").toLowerCase();
  if (/wifi|wi[- ]?fi/.test(text)) return "amenities_info";
  return "reservation";
}

async function runScenario(useGraph: boolean) {
  const sendReply = vi.fn(async () => {});
  const envGraph = process.env.USE_MH_FLOW_GRAPH;
  const envOrch = process.env.USE_ORCHESTRATOR_AGENT;
  process.env.USE_MH_FLOW_GRAPH = useGraph ? "1" : "0";
  process.env.USE_ORCHESTRATOR_AGENT = "0";

  currentState = null;
  const convId = `conv-exp-create-${useGraph ? "graph" : "handler"}`;

  await handleIncomingMessage(
    msg("quiero reservar del 1 al 5 de mayo para 2 personas", convId),
    { mode: "automatic", sendReply }
  );
  await handleIncomingMessage(
    msg("¿el wifi está incluido?", convId),
    { mode: "automatic", sendReply }
  );
  const lateralReply = lastReply(sendReply);
  const lateralDomain = currentState?.lastCategory || inferDomainFromReply(lateralReply);
  const lateralFallback =
    lateralDomain === "retrieval_based" || lateralDomain === "out_of_scope" || lateralDomain === "fallback";
  const lateralPure =
    !/reserva|habitaci[oó]n|hu[eé]sped|fecha|disponibilidad|tarifa|precio|cotiz/i.test(lateralReply) &&
    !/^reservation/.test(lateralDomain || "") &&
    !/^modify/.test(lateralDomain || "") &&
    lateralDomain !== "cancel_reservation";
  const lateralHasCreatePrompt = /tipo de habitaci[oó]n|cu[aá]ntos hu[eé]spedes|a nombre de/i.test(lateralReply);

  await handleIncomingMessage(
    msg("sí, continuar", convId),
    { mode: "automatic", sendReply }
  );
  const followupReply = lastReply(sendReply);
  const createContinuity = /tipo de habitaci[oó]n/i.test(followupReply);

  process.env.USE_MH_FLOW_GRAPH = envGraph;
  process.env.USE_ORCHESTRATOR_AGENT = envOrch;

  return {
    domain: lateralDomain,
    fallback: lateralFallback,
    pure: lateralPure && !lateralHasCreatePrompt,
    createContinuity,
    lateralReply,
    followupReply,
  };
}

describe("EXP-PIPELINE-CREATE-LATERAL-PARITY-02", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("compares create-lateral behavior between handler and graph", async () => {
    const handlerResult = await runScenario(false);
    const graphResult = await runScenario(true);
    const parity = evaluateParity(handlerResult, graphResult);
    const expectedParity: "PARIDAD_OK" | "PARIDAD_PARCIAL" | "PARIDAD_NO" = "PARIDAD_PARCIAL";

    console.log("[EXP-CREATE-LATERAL] HANDLER");
    summarizeResult("handler", handlerResult);
    console.log("[EXP-CREATE-LATERAL] GRAPH");
    summarizeResult("graph", graphResult);
    console.log(`[EXP-CREATE-LATERAL] RESULT | ${parity}`);

    expect(handlerResult.lateralReply.length).toBeGreaterThan(0);
    expect(graphResult.lateralReply.length).toBeGreaterThan(0);
    expect(["PARIDAD_OK", "PARIDAD_PARCIAL", "PARIDAD_NO"]).toContain(parity);
    expect(parity).toBe(expectedParity);
    expect(handlerResult.createContinuity).toBe(true);
    expect(graphResult.createContinuity).toBe(true);
    expect(handlerResult.pure).toBe(false);
    expect(graphResult.pure).toBe(false);
  });
});

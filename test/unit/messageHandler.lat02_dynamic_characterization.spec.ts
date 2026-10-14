// Path: test/unit/messageHandler.lat02_dynamic_characterization.spec.ts

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type StructuredResult = {
  answer: string;
  intent: "reservation_inquiry";
  entities: Record<string, never>;
  actions: Array<{ type: string; detail: string }>;
  handoff: boolean;
  missing_fields: string[];
  language: "es";
};

const characterization = vi.hoisted(() => ({
  currentState: null as any,
  statePatches: [] as any[],
  savedMessages: [] as any[],
  fillSlotsCalls: 0,
  slotProviderCalls: 0,
  structuredClientBuilds: 0,
  structuredProviderCalls: 0,
  availabilityCalls: 0,
  proposalPersistenceCalls: 0,
  confirmAndCreateCalls: 0,
  supervisionInputs: [] as boolean[],
  conditionalTextUpdateCalls: [] as any[],
  conditionalTextUpdateMode: "normal" as "normal" | "unmatched" | "throw",
  beforeConditionalTextUpdate: null as null | (() => void),
  failCanonicalReadAfterProposal: false,
  canonicalReadTamper: null as null | ((state: any) => any),
  proposalTamper: null as null | ((proposal: any) => any),
  structuredError: null as Error | null,
  slotResponse: JSON.stringify({
    guestName: "Ana Gomez",
    roomType: "double",
    guests: 2,
    checkIn: "2027-11-10",
    checkOut: "2027-11-12",
    locale: "es",
  }),
  structuredResult: {
    answer: "Respuesta estructurada que no debe reemplazar la propuesta autoritativa.",
    intent: "reservation_inquiry",
    entities: {},
    actions: [{ type: "no_action", detail: "none" }],
    handoff: false,
    missing_fields: [],
    language: "es",
  } as StructuredResult,
  availabilityResult: {
    ok: true,
    available: true,
    proposal: "Texto crudo del proveedor que debe canonicalizar el pipeline.",
    options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
  } as any,
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class TestChatOpenAI {
    async invoke() {
      characterization.slotProviderCalls += 1;
      return { content: characterization.slotResponse };
    }

    withStructuredOutput() {
      characterization.structuredClientBuilds += 1;
      return {
        invoke: async () => {
          characterization.structuredProviderCalls += 1;
          if (characterization.structuredError) throw characterization.structuredError;
          return characterization.structuredResult;
        },
      };
    }
  },
}));

vi.mock("@/lib/agents/reservations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agents/reservations")>("@/lib/agents/reservations");
  return {
    ...actual,
    fillSlotsWithLLM: vi.fn(async (...args: Parameters<typeof actual.fillSlotsWithLLM>) => {
      characterization.fillSlotsCalls += 1;
      return actual.fillSlotsWithLLM(...args);
    }),
    askAvailability: vi.fn(async () => {
      characterization.availabilityCalls += 1;
      return characterization.availabilityResult;
    }),
    confirmAndCreate: vi.fn(async () => {
      characterization.confirmAndCreateCalls += 1;
      return { ok: true, reservationId: "MUST-NOT-BE-CREATED", message: "unexpected" };
    }),
  };
});

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (message: any) => {
    characterization.savedMessages.push({ ...message });
  }),
  getMessagesByConversation: vi.fn(async () => []),
}));

vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => ({
    guestId: "guest-lat02",
    hotelId: "hotel999",
    name: "Marcelo",
    mode: "automatic",
  })),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => {
    if (characterization.failCanonicalReadAfterProposal && characterization.currentState?.lastProposal) {
      throw new Error("simulated canonical read failure");
    }
    if (characterization.currentState?.lastProposal && characterization.canonicalReadTamper) {
      return characterization.canonicalReadTamper(characterization.currentState);
    }
    return characterization.currentState;
  }),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    characterization.statePatches.push(patch);
    if (Object.prototype.hasOwnProperty.call(patch, "lastProposal")) {
      characterization.proposalPersistenceCalls += 1;
    }
    characterization.currentState = {
      ...(characterization.currentState || {}),
      ...patch,
      reservationSlots: patch.reservationSlots
        ? {
            ...(characterization.currentState?.reservationSlots || {}),
            ...patch.reservationSlots,
          }
        : characterization.currentState?.reservationSlots,
    };
    if (patch.lastProposal && characterization.proposalTamper) {
      characterization.currentState = {
        ...characterization.currentState,
        lastProposal: characterization.proposalTamper(characterization.currentState.lastProposal),
      };
    }
    return characterization.currentState;
  }),
  updateLastProposalTextIfCurrent: vi.fn(async (
    hotelId: string,
    _conversationId: string,
    identity: any,
    text: string
  ) => {
    characterization.conditionalTextUpdateCalls.push({ hotelId, identity, text });
    characterization.beforeConditionalTextUpdate?.();
    if (characterization.conditionalTextUpdateMode === "throw") {
      throw new Error("simulated conditional text update failure");
    }
    const proposal = characterization.currentState?.lastProposal;
    const input = proposal?.toolCall?.input;
    const matched = characterization.conditionalTextUpdateMode !== "unmatched" && Boolean(
      proposal?.available === true &&
      (proposal?.text === identity.sourceText || proposal?.text === text) &&
      proposal?.toolCall?.name === "checkAvailability" &&
      proposal?.toolCall?.outputSummary === "available:true" &&
      proposal?.toolCall?.at === identity.toolCallAt &&
      input?.hotelId === identity.input.hotelId &&
      input?.roomType === identity.input.roomType &&
      input?.numGuests === identity.input.numGuests &&
      input?.checkIn === identity.input.checkIn &&
      input?.checkOut === identity.input.checkOut
    );
    if (!matched) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    const modified = proposal.text !== text;
    characterization.currentState = {
      ...characterization.currentState,
      lastProposal: { ...proposal, text },
    };
    return {
      matched: true,
      modified,
      matchedCount: 1,
      modifiedCount: modified ? 1 : 0,
    };
  }),
  CONVSTATE_VERSION: "lat02-characterization",
  resolveGuestState: vi.fn((state: any) => {
    if (!state) return undefined;
    if (state.salesStage === "close" || state.conversationStage === "reservation_confirmed") return "booked";
    if (state.reservationSlots || state.salesStage || state.conversationStage) return "prospect";
    return undefined;
  }),
}));

vi.mock("@/lib/agents/supervisorAgent", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agents/supervisorAgent")>("@/lib/agents/supervisorAgent");
  return {
    ...actual,
    decideSupervisorStatus: vi.fn((input: Parameters<typeof actual.decideSupervisorStatus>[0]) => {
      characterization.supervisionInputs.push(input.needsSupervision);
      return actual.decideSupervisorStatus(input);
    }),
  };
});

vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: false,
    category: "retrieval_based",
    answer: "",
    retrieved: [],
  })),
}));

vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/prompts", () => ({ defaultPrompt: "{{retrieved}}", curatedPrompts: {} }));

let handleIncomingMessage: typeof import("@/lib/handlers/messageHandler").handleIncomingMessage;

const previousEnv = {
  FORCE_GENERATION: process.env.FORCE_GENERATION,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  STRUCTURED_ENABLED: process.env.STRUCTURED_ENABLED,
  USE_MH_FLOW_GRAPH: process.env.USE_MH_FLOW_GRAPH,
  USE_ORCHESTRATOR_AGENT: process.env.USE_ORCHESTRATOR_AGENT,
  USE_PRE_POS_PIPELINE: process.env.USE_PRE_POS_PIPELINE,
};

function restoreEnv(name: keyof typeof previousEnv) {
  const value = previousEnv[name];
  if (typeof value === "undefined") delete process.env[name];
  else process.env[name] = value;
}

function incomingMessage(suffix: string) {
  return {
    messageId: `lat02-${suffix}`,
    hotelId: "hotel999",
    channel: "web" as const,
    sender: "guest",
    guestId: "guest-lat02",
    conversationId: `conv-lat02-${suffix}`,
    content: "Quiero reservar",
    detectedLanguage: "es",
    timestamp: "2026-10-12T12:00:00.000Z",
  } as any;
}

function outputMessage() {
  return characterization.savedMessages.find((message) => message.sender === "assistant");
}

async function runScenario(suffix: string) {
  const sendReply = vi.fn(async () => {});
  await handleIncomingMessage(incomingMessage(suffix), { mode: "automatic", sendReply });
  return {
    output: outputMessage(),
    state: characterization.currentState,
    proposalPatches: characterization.statePatches.filter((patch) =>
      Object.prototype.hasOwnProperty.call(patch, "lastProposal")
    ),
    sendReply,
  };
}

describe("LAT-02 dynamic characterization of the post-Graph structured boundary", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.FORCE_GENERATION = "1";
    process.env.OPENAI_API_KEY = "test-key-never-used";
    process.env.STRUCTURED_ENABLED = "true";
    process.env.USE_MH_FLOW_GRAPH = "0";
    process.env.USE_ORCHESTRATOR_AGENT = "0";
    process.env.USE_PRE_POS_PIPELINE = "0";
    handleIncomingMessage = (await import("@/lib/handlers/messageHandler")).handleIncomingMessage;

    // FORCE_GENERATION is captured at module load to cross the test short-circuit.
    // Removing it here preserves the real runtime supervision decision during execution.
    process.env.FORCE_GENERATION = "0";
  });

  beforeEach(() => {
    characterization.currentState = null;
    characterization.statePatches.length = 0;
    characterization.savedMessages.length = 0;
    characterization.fillSlotsCalls = 0;
    characterization.slotProviderCalls = 0;
    characterization.structuredClientBuilds = 0;
    characterization.structuredProviderCalls = 0;
    characterization.availabilityCalls = 0;
    characterization.proposalPersistenceCalls = 0;
    characterization.confirmAndCreateCalls = 0;
    characterization.supervisionInputs.length = 0;
    characterization.conditionalTextUpdateCalls.length = 0;
    characterization.conditionalTextUpdateMode = "normal";
    characterization.beforeConditionalTextUpdate = null;
    characterization.failCanonicalReadAfterProposal = false;
    characterization.canonicalReadTamper = null;
    characterization.proposalTamper = null;
    characterization.structuredError = null;
    characterization.slotResponse = JSON.stringify({
      guestName: "Ana Gomez",
      roomType: "double",
      guests: 2,
      checkIn: "2027-11-10",
      checkOut: "2027-11-12",
      locale: "es",
    });
    characterization.structuredResult = {
      answer: "Respuesta estructurada que no debe reemplazar la propuesta autoritativa.",
      intent: "reservation_inquiry",
      entities: {},
      actions: [{ type: "no_action", detail: "none" }],
      handoff: false,
      missing_fields: [],
      language: "es",
    };
    characterization.availabilityResult = {
      ok: true,
      available: true,
      proposal: "Texto crudo del proveedor que debe canonicalizar el pipeline.",
      options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
    };
    vi.clearAllMocks();
  });

  afterAll(() => {
    restoreEnv("FORCE_GENERATION");
    restoreEnv("OPENAI_API_KEY");
    restoreEnv("STRUCTURED_ENABLED");
    restoreEnv("USE_MH_FLOW_GRAPH");
    restoreEnv("USE_ORCHESTRATOR_AGENT");
    restoreEnv("USE_PRE_POS_PIPELINE");
  });

  it("reaches reservationNode, persists a rich proposal, then invokes the structured provider", async () => {
    const result = await runScenario("positive");

    expect(characterization.fillSlotsCalls).toBe(1);
    expect(characterization.slotProviderCalls).toBe(1);
    expect(characterization.availabilityCalls).toBe(1);
    expect(characterization.structuredClientBuilds).toBe(1);
    expect(characterization.structuredProviderCalls).toBe(1);
    expect(characterization.confirmAndCreateCalls).toBe(0);
    expect(characterization.supervisionInputs).toEqual([false]);

    expect(result.output).toMatchObject({
      status: "sent",
      content: expect.stringMatching(/doble disponible.*125 USD/is),
      meta: { responseTrace: { category: "reservation" } },
    });
    expect(result.state.reservationSlots).toMatchObject({
      guestName: "Ana Gomez",
      roomType: "double",
      numGuests: "2",
      checkIn: "2027-11-10",
      checkOut: "2027-11-12",
      locale: "es",
    });

    const richProposal = result.proposalPatches[0].lastProposal;
    expect(richProposal).toMatchObject({
      available: true,
      options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
      suggestedRoomType: "double",
      suggestedPricePerNight: 125,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId: "hotel999",
          roomType: "double",
          numGuests: 2,
          checkIn: "2027-11-10",
          checkOut: "2027-11-12",
        },
        outputSummary: "available:true",
        at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    });
    expect(richProposal.text).not.toBe(result.output.content);

    expect(characterization.proposalPersistenceCalls).toBe(1);
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(1);
    expect(result.state.lastProposal).toMatchObject({
      text: result.output.content,
      available: true,
      options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
      suggestedRoomType: "double",
      suggestedPricePerNight: 125,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId: "hotel999",
          roomType: "double",
          numGuests: 2,
          checkIn: "2027-11-10",
          checkOut: "2027-11-12",
        },
        outputSummary: "available:true",
        at: richProposal.toolCall.at,
      },
    });
    expect(result.state).toMatchObject({
      lastCategory: "reservation",
      desiredAction: "create",
      activeFlow: "reservation",
      conversationFocus: { domain: "reservation", subFlow: "create", active: true },
      activeReservationContext: { kind: "draft", phase: "quoted" },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
    });
  });

  it("keeps the current negative-availability supervision and persistence baseline", async () => {
    characterization.availabilityResult = {
      ok: true,
      available: false,
      proposal: "No tengo disponibilidad en esas fechas.",
      options: [],
    };

    const result = await runScenario("negative");

    expect(characterization.fillSlotsCalls).toBe(1);
    expect(characterization.structuredProviderCalls).toBe(1);
    expect(characterization.availabilityCalls).toBe(1);
    expect(characterization.supervisionInputs).toEqual([false]);
    expect(result.output).toMatchObject({
      status: "sent",
      content: expect.stringMatching(/No tengo disponibilidad.*recepcionista/is),
      meta: { responseTrace: { category: "reservation" } },
    });
    expect(result.state.lastProposal).toMatchObject({
      available: false,
      toolCall: {
        input: {
          checkIn: "2027-11-10",
          checkOut: "2027-11-12",
          roomType: "double",
          numGuests: 2,
        },
        outputSummary: "available:false",
      },
    });
    expect(characterization.proposalPersistenceCalls).toBe(1);
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
    expect(characterization.confirmAndCreateCalls).toBe(0);
  });

  it("preserves the authoritative proposal when the structured provider fails", async () => {
    characterization.structuredError = new Error("simulated structured provider failure");

    const result = await runScenario("provider-error");

    expect(characterization.fillSlotsCalls).toBe(1);
    expect(characterization.availabilityCalls).toBe(1);
    expect(characterization.structuredClientBuilds).toBe(1);
    expect(characterization.structuredProviderCalls).toBe(1);
    expect(characterization.supervisionInputs).toEqual([false]);
    expect(result.output.status).toBe("sent");
    expect(result.output.content).toMatch(/doble disponible.*125 USD/is);
    expect(result.state.lastProposal).toMatchObject({
      text: result.output.content,
      available: true,
      options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
      suggestedRoomType: "double",
      suggestedPricePerNight: 125,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId: "hotel999",
          roomType: "double",
          numGuests: 2,
          checkIn: "2027-11-10",
          checkOut: "2027-11-12",
        },
        outputSummary: "available:true",
        at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    });
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(1);
    expect(characterization.confirmAndCreateCalls).toBe(0);
  });

  it("still invokes structured enrichment when reservationNode returns an incomplete proposal", async () => {
    characterization.slotResponse = [
      JSON.stringify({ roomType: "double", locale: "es" }),
      "¿Cuál sería la fecha de check-in?",
    ].join("\n");

    const result = await runScenario("incomplete");

    expect(characterization.fillSlotsCalls).toBe(1);
    expect(characterization.slotProviderCalls).toBe(1);
    expect(characterization.availabilityCalls).toBe(0);
    expect(characterization.structuredProviderCalls).toBe(1);
    expect(characterization.proposalPersistenceCalls).toBe(0);
    expect(characterization.supervisionInputs).toEqual([false]);
    expect(result.output).toMatchObject({
      status: "sent",
      content: expect.stringMatching(/check-in/i),
      meta: { responseTrace: { category: "reservation" } },
    });
    expect(result.state.lastProposal).toBeUndefined();
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
    expect(characterization.confirmAndCreateCalls).toBe(0);
  });

  it("marks the authoritative proposal pending when structured enrichment requests handoff", async () => {
    characterization.structuredResult = {
      ...characterization.structuredResult,
      handoff: true,
      actions: [{ type: "notify_reception", detail: "manual review" }],
    };

    const result = await runScenario("handoff");

    expect(characterization.fillSlotsCalls).toBe(1);
    expect(characterization.availabilityCalls).toBe(1);
    expect(characterization.structuredProviderCalls).toBe(1);
    expect(characterization.supervisionInputs).toEqual([true]);
    expect(result.output).toMatchObject({
      status: "pending",
      respondedBy: "assistant",
      content: expect.stringMatching(/doble disponible.*125 USD/is),
      meta: { responseTrace: { category: "reservation" } },
    });
    expect(result.state.lastProposal).toMatchObject({
      text: result.output.content,
      available: true,
      options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
      suggestedRoomType: "double",
      suggestedPricePerNight: 125,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId: "hotel999",
          roomType: "double",
          numGuests: 2,
          checkIn: "2027-11-10",
          checkOut: "2027-11-12",
        },
        outputSummary: "available:true",
        at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    });
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(1);
    expect(characterization.confirmAndCreateCalls).toBe(0);
  });

  it.each([
    ["historical proposal", (proposal: any) => ({
      ...proposal,
      toolCall: { ...proposal.toolCall, at: "2020-01-01T00:00:00.000Z" },
    })],
    ["different hotel", (proposal: any) => ({
      ...proposal,
      toolCall: {
        ...proposal.toolCall,
        input: { ...proposal.toolCall.input, hotelId: "hotel-other" },
      },
    })],
    ["different room", (proposal: any) => ({
      ...proposal,
      toolCall: {
        ...proposal.toolCall,
        input: { ...proposal.toolCall.input, roomType: "suite" },
      },
    })],
    ["different check-in", (proposal: any) => ({
      ...proposal,
      toolCall: {
        ...proposal.toolCall,
        input: { ...proposal.toolCall.input, checkIn: "2027-12-01" },
      },
    })],
    ["different check-out", (proposal: any) => ({
      ...proposal,
      toolCall: {
        ...proposal.toolCall,
        input: { ...proposal.toolCall.input, checkOut: "2027-12-03" },
      },
    })],
    ["different guest count", (proposal: any) => ({
      ...proposal,
      toolCall: {
        ...proposal.toolCall,
        input: { ...proposal.toolCall.input, numGuests: 3 },
      },
    })],
    ["future timestamp", (proposal: any) => ({
      ...proposal,
      toolCall: { ...proposal.toolCall, at: "2099-01-01T00:00:00.000Z" },
    })],
    ["missing tool call", (proposal: any) => {
      const { toolCall: _toolCall, ...withoutToolCall } = proposal;
      return withoutToolCall;
    }],
    ["different proposal text", (proposal: any) => ({
      ...proposal,
      text: "Texto de otra propuesta",
    })],
  ])("does not attribute a %s to the current turn", async (_label, tamper) => {
    characterization.proposalTamper = tamper;

    const result = await runScenario(`mismatch-${String(_label).replaceAll(" ", "-")}`);

    expect(result.output).toMatchObject({ status: "sent" });
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
    expect(result.state.lastProposal.text).not.toBe(result.output.content);
    expect(characterization.confirmAndCreateCalls).toBe(0);
  });

  it("keeps the rich proposal unchanged when the canonical reread fails", async () => {
    characterization.failCanonicalReadAfterProposal = true;

    const result = await runScenario("canonical-read-failure");

    expect(result.output).toMatchObject({ status: "sent" });
    expect(result.state.lastProposal).toMatchObject({
      available: true,
      options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
      toolCall: { name: "checkAvailability" },
    });
    expect(result.state.lastProposal.text).not.toBe(result.output.content);
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
  });

  it("does not update text when the canonical proposal is missing", async () => {
    characterization.proposalTamper = () => undefined;

    const result = await runScenario("missing-canonical-proposal");

    expect(result.output).toMatchObject({ status: "sent" });
    expect(result.state.lastProposal).toBeUndefined();
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
  });

  it("does not update text when the canonical slot snapshot is inconsistent", async () => {
    characterization.canonicalReadTamper = (state) => ({
      ...state,
      reservationSlots: { ...state.reservationSlots, numGuests: "3" },
    });

    const result = await runScenario("inconsistent-canonical-snapshot");

    expect(result.output).toMatchObject({ status: "sent" });
    expect(result.state.lastProposal.text).not.toBe(result.output.content);
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
  });

  it.each([
    ["reservation domain", (state: any) => ({
      ...state,
      lastCategory: "support",
      conversationFocus: { ...state.conversationFocus, domain: "support" },
    })],
    ["create action", (state: any) => ({
      ...state,
      desiredAction: "modify",
      conversationFocus: { ...state.conversationFocus, subFlow: "modify" },
    })],
  ])("does not update text without canonical %s attribution", async (_label, tamper) => {
    characterization.canonicalReadTamper = tamper;

    const result = await runScenario(`canonical-${String(_label).replaceAll(" ", "-")}`);

    expect(result.output).toMatchObject({ status: "sent" });
    expect(result.state.lastProposal.text).not.toBe(result.output.content);
    expect(characterization.conditionalTextUpdateCalls).toHaveLength(0);
  });

  it.each(["throw", "unmatched"] as const)(
    "keeps the rich proposal unchanged when the conditional update returns %s",
    async (mode) => {
      characterization.conditionalTextUpdateMode = mode;

      const result = await runScenario(`conditional-${mode}`);

      expect(result.output).toMatchObject({ status: "sent" });
      expect(result.state.lastProposal).toMatchObject({
        available: true,
        options: [{ roomType: "double", pricePerNight: 125, currency: "USD" }],
        toolCall: { name: "checkAvailability" },
      });
      expect(result.state.lastProposal.text).not.toBe(result.output.content);
      expect(characterization.conditionalTextUpdateCalls).toHaveLength(1);
    }
  );

  it("does not overwrite a newer proposal in an A to B race", async () => {
    characterization.beforeConditionalTextUpdate = () => {
      characterization.currentState = {
        ...characterization.currentState,
        lastProposal: {
          text: "Propuesta B",
          available: true,
          options: [{ roomType: "suite", pricePerNight: 240, currency: "USD" }],
          suggestedRoomType: "suite",
          suggestedPricePerNight: 240,
          toolCall: {
            name: "checkAvailability",
            input: {
              hotelId: "hotel999",
              roomType: "suite",
              numGuests: 3,
              checkIn: "2027-12-01",
              checkOut: "2027-12-03",
            },
            outputSummary: "available:true",
            at: "2026-10-12T12:00:01.000Z",
          },
        },
      };
    };

    const result = await runScenario("race-a-to-b");

    expect(characterization.conditionalTextUpdateCalls).toHaveLength(1);
    expect(result.state.lastProposal).toMatchObject({
      text: "Propuesta B",
      available: true,
      suggestedRoomType: "suite",
      toolCall: {
        input: { roomType: "suite", numGuests: 3 },
        at: "2026-10-12T12:00:01.000Z",
      },
    });
    expect(characterization.confirmAndCreateCalls).toBe(0);
  });
});

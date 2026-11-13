// Path: /root/begasist/test/unit/kb.greetingFallback.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

const classifyQueryMock = vi.fn();
const resolveCategoryForHotelMock = vi.fn();
const searchFromAstraMock = vi.fn();
const hydratedContentMock = vi.fn();
const invokeMock = vi.fn();

vi.mock("@/lib/classifier", () => ({
  classifyQuery: classifyQueryMock,
}));

vi.mock("@/lib/categories/resolveCategory", () => ({
  resolveCategoryForHotel: resolveCategoryForHotelMock,
}));

vi.mock("@/lib/retrieval", () => ({
  searchFromAstra: searchFromAstraMock,
}));

vi.mock("@/lib/kb/knowledgeBaseHydrator", () => ({
  DefaultKnowledgeBaseHydrator: class {
    async getHydratedContent(...args: any[]) {
      return hydratedContentMock(...args);
    }
  },
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    async invoke(...args: any[]) {
      return invokeMock(...args);
    }
  },
}));

describe("knowledgeBaseAgent greeting fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses safe kb_general template when classification is retrieval_based with null promptKey ("Hola")', async () => {
    classifyQueryMock.mockResolvedValue({
      category: "retrieval_based",
      promptKey: null,
    });

    resolveCategoryForHotelMock.mockResolvedValue({
      lang: "es",
      router: {
        category: "retrieval_based",
        promptKey: "kb_general",
      },
      retriever: { topK: 3 },
      content: {
        title: "Información general del hotel (KB general)",
        body: "Resumen general del hotel.",
      },
    });

    hydratedContentMock.mockResolvedValue({
      text: "Contexto general del hotel sin detalles de habitaciones.",
    });

    searchFromAstraMock.mockResolvedValue([]);

    invokeMock.mockImplementation(async (messages: any[]) => {
      const human = messages?.find?.((m: any) => m?.constructor?.name === "HumanMessage");
      const content = typeof human?.content === "string" ? human.content : "";
      return { content };
    });

    const { answerWithKnowledge } = await import("@/lib/agents/knowledgeBaseAgent");
    const res = await answerWithKnowledge({
      question: "Hola",
      hotelId: "hotel999",
      override: { category: "retrieval_based" },
    });

    expect(res.ok).toBe(true);
    expect(res.category).toBe("retrieval_based");
    expect(res.debug?.usedPromptTemplate).not.toBe("room_info");
    expect(res.debug?.usedPromptTemplate).toBe("kb_general");
    expect(String(res.answer || "")).not.toContain("Habitación Doble");
    expect(String(res.answer || "")).not.toContain("booking.bedzzle.com");
  });

  it("bypasses classifyQuery when category and promptKey are explicitly overridden", async () => {
    resolveCategoryForHotelMock.mockResolvedValue({
      lang: "es",
      router: {
        category: "retrieval_based",
        promptKey: "arrivals_transport",
      },
      retriever: { topK: 3 },
      content: null,
    });
    hydratedContentMock.mockResolvedValue({ text: "PDP 5 km; MVD 120 km" });
    searchFromAstraMock.mockResolvedValue(["Transfer, taxi y bus disponibles."]);
    invokeMock.mockResolvedValue({ content: "Información de transporte." });

    const { answerWithKnowledge } = await import("@/lib/agents/knowledgeBaseAgent");
    const res = await answerWithKnowledge({
      question: "que aeropuerto hay cerca del hotel",
      hotelId: "hotel999",
      override: {
        category: "retrieval_based",
        promptKey: "arrivals_transport",
      },
    });

    expect(classifyQueryMock).not.toHaveBeenCalled();
    expect(resolveCategoryForHotelMock).toHaveBeenCalledWith(expect.objectContaining({
      category: "retrieval_based",
      promptKey: "arrivals_transport",
    }));
    expect(searchFromAstraMock).toHaveBeenCalledWith(
      "que aeropuerto hay cerca del hotel",
      "hotel999",
      expect.objectContaining({
        category: "retrieval_based",
        promptKey: "arrivals_transport",
      }),
      "es"
    );
    expect(res.promptKey).toBe("arrivals_transport");
  });

  it("places optional conversational history between the system prompt and current question", async () => {
    classifyQueryMock.mockResolvedValue({
      category: "retrieval_based",
      promptKey: "kb_general",
    });
    resolveCategoryForHotelMock.mockResolvedValue({
      lang: "es",
      router: { category: "retrieval_based", promptKey: "kb_general" },
      retriever: { topK: 3 },
      content: null,
    });
    hydratedContentMock.mockResolvedValue({ text: "Contexto general del hotel." });
    searchFromAstraMock.mockResolvedValue([]);
    invokeMock.mockResolvedValue({ content: "Me comentaste que viajarías con tu esposa." });

    const { answerWithKnowledge } = await import("@/lib/agents/knowledgeBaseAgent");
    const question = "¿Te acordás con quién voy a alojarme?";
    await answerWithKnowledge({
      question,
      hotelId: "hotel999",
      conversationHistory: [
        new HumanMessage("Estoy pensando alojarme con mi esposa."),
        new AIMessage("Perfecto, ¿en qué puedo ayudarte?"),
      ],
    } as any);

    expect(classifyQueryMock).toHaveBeenCalledWith(question, "hotel999");
    expect(searchFromAstraMock).toHaveBeenCalledWith(
      question,
      "hotel999",
      expect.any(Object),
      "es",
    );
    const messages = invokeMock.mock.calls[0]?.[0] as any[];
    expect(messages.map((message) => message._getType())).toEqual(["system", "human", "ai", "human"]);
    expect(messages[1]?.content).toBe("Estoy pensando alojarme con mi esposa.");
    expect(messages[2]?.content).toBe("Perfecto, ¿en qué puedo ayudarte?");
    expect(messages[3]?.content).toContain(question);
  });
});

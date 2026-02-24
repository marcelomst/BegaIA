// Path: /root/begasist/test/unit/kb.greetingFallback.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});

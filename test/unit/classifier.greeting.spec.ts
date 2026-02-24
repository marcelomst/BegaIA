// Path: /root/begasist/test/unit/classifier.greeting.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const getDictionaryMock = vi.fn();
const getHotelNativeLanguageMock = vi.fn();
const looksRoomInfoMock = vi.fn();

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    async invoke(...args: any[]) {
      return invokeMock(...args);
    }
  },
}));

vi.mock("@/lib/config/hotelLanguage", () => ({
  getHotelNativeLanguage: getHotelNativeLanguageMock,
}));

vi.mock("@/lib/i18n/getDictionary", () => ({
  getDictionary: getDictionaryMock,
}));

vi.mock("@/lib/agents/helpers", () => ({
  looksRoomInfo: looksRoomInfoMock,
}));

describe("classifier greeting category", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHotelNativeLanguageMock.mockResolvedValue("es");
    getDictionaryMock.mockResolvedValue({
      classifierPrompt: `Categorias: {{allowedCategories}}
PromptKeys: {{allPromptKeys}}
Pregunta: {{question}}`,
    });
    looksRoomInfoMock.mockReturnValue(false);
    invokeMock.mockResolvedValue({
      content: JSON.stringify({ category: "greeting", promptKey: "greeting" }),
    });
  });

  it.each(["Hola", "Hi", "Hello", "Bom dia"])(
    'classifies pure greeting "%s" as greeting',
    async (input) => {
      const { classifyQuery } = await import("@/lib/classifier");
      const res = await classifyQuery(input, "hotel999");

      expect(res.category).toBe("greeting");
      expect(res.promptKey).toBe("greeting");
    }
  );

  it('does not classify mixed greeting "Hola quiero reservar" as greeting (coerces to reservation)', async () => {
    const { classifyQuery } = await import("@/lib/classifier");
    const res = await classifyQuery("Hola quiero reservar", "hotel999");

    expect(res.category).toBe("reservation");
    expect(res.promptKey).toBeNull();
  });
});

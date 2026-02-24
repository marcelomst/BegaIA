// Path: /root/begasist/test/graph.greeting.flow.spec.ts
import { describe, expect, it, vi } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

const searchFromAstraMock = vi.fn();

vi.mock("@/lib/retrieval", () => ({
  searchFromAstra: searchFromAstraMock,
}));

describe("graph greeting flow", () => {
  it('returns direct greeting response for "Hola" without retrieval', async () => {
    const { agentGraph } = await import("@/lib/agents");

    const res = await agentGraph.invoke({
      hotelId: "hotel999",
      conversationId: "greet-1",
      detectedLanguage: "es",
      category: "greeting",
      promptKey: "greeting",
      messages: [new HumanMessage("Hola")],
    });

    const last = res.messages[res.messages.length - 1];
    const text = typeof last?.content === "string" ? last.content : JSON.stringify(last?.content);

    expect(res.category).toBe("greeting");
    expect((res as any).promptKey).toBe("greeting");
    expect(text.length).toBeLessThan(120);
    expect(text).toBe("¡Hola! 👋 ¿En qué puedo ayudarte hoy?");
    expect(searchFromAstraMock).not.toHaveBeenCalled();
  });
});

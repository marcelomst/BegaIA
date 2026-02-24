import { describe, it, expect } from "vitest";
import { renderCuratedTemplate } from "@/lib/prompts/renderCuratedTemplate";

describe("renderCuratedTemplate", () => {
  it("renders key with default when missing", () => {
    const body = "Hola [[key: user.name | default: amigo]]";
    const out = renderCuratedTemplate(body, {});
    expect(out).toBe("Hola amigo");
  });

  it("renders each with two events", () => {
    const body =
      "Eventos:\n" +
      "[[each: events | default: (sin eventos) ->\n" +
      "- [[name]]\n" +
      "  - [[when]]\n" +
      "  - [[place]]\n" +
      "  - [[sourceUrl]]\n" +
      "]]";
    const out = renderCuratedTemplate(body, {
      events: [
        { name: "Evento A", when: "Hoy 10:00", place: "Plaza", sourceUrl: "https://a.test" },
        { name: "Evento B", when: "Maniana 18:00", place: "Teatro", sourceUrl: "" },
      ],
    });
    expect(out).toContain("Evento A");
    expect(out).toContain("Evento B");
    expect(out).toContain("Plaza");
    expect(out).toContain("Teatro");
  });
});

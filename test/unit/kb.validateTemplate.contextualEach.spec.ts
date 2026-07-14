import { describe, expect, it } from "vitest";

import { validateKbTemplate } from "@/lib/kb/validateKbTemplate";
import { getTemplate } from "@/lib/prompts/templates";

const hotelConfig = {
  hotelName: "Hotel Demo",
  rooms: [
    {
      name: "Single Standard",
      icon: "🛏️",
      description: "Habitación individual con vista al mar",
      images: ["/hotel999/rooms/single/single.jpg"],
    },
    {
      name: "Doble",
      icon: "🛌",
      description: "Habitación doble con balcón",
      images: ["/hotel999/rooms/double/double.jpg"],
    },
  ],
};

describe("validateKbTemplate contextual each tokens", () => {
  it("valida tokens raiz fuera de each contra hotel_config raiz", async () => {
    const result = await validateKbTemplate({
      hotelConfig,
      template: "[[hotelName]]",
    });

    expect(result.summary).toBe("OK");
    expect(result.missingFromHotelConfig).toEqual([]);
    expect(result.missingContextualFields).toEqual([]);
  });

  it("valida tokens contextuales dentro de rooms contra rooms[] y no como root missing", async () => {
    const result = await validateKbTemplate({
      hotelConfig,
      template: "[[each: rooms -> [[name]] [[icon]] [[description]]]]",
    });

    expect(result.summary).toBe("OK");
    expect(result.missingFromHotelConfig).not.toEqual(
      expect.arrayContaining(["name", "icon", "description"]),
    );
    expect(result.missingContextualFields).toEqual([]);
  });

  it("reporta tokens inexistentes dentro de rooms como faltantes contextuales", async () => {
    const result = await validateKbTemplate({
      hotelConfig,
      template: "[[each: rooms -> [[nonexistentField]]]]",
    });

    expect(result.summary).toBe("ISSUES");
    expect(result.missingFromHotelConfig).not.toContain("nonexistentField");
    expect(result.missingContextualFields).toEqual(["rooms[].nonexistentField"]);
  });

  it("valida correctamente una combinacion de token raiz y tokens contextuales", async () => {
    const result = await validateKbTemplate({
      hotelConfig,
      template: [
        "[[hotelName]]",
        "[[each: rooms -> [[name]] [[description]]]]",
      ].join("\n"),
    });

    expect(result.summary).toBe("OK");
    expect(result.missingFromHotelConfig).toEqual([]);
    expect(result.missingContextualFields).toEqual([]);
  });

  it("no reporta name icon description como root missing en el template real room_info_img", async () => {
    const template = getTemplate("retrieval_based", "room_info_img", "es");

    expect(template).toBeTruthy();
    const result = await validateKbTemplate({
      hotelConfig,
      template: template?.body || "",
      promptKey: "room_info_img",
    });

    expect(result.summary).toBe("OK");
    expect(result.missingFromHotelConfig).not.toEqual(
      expect.arrayContaining(["name", "icon", "description"]),
    );
    expect(result.missingContextualFields).toEqual([]);
  });

  it("sigue reportando tokens raiz inexistentes", async () => {
    const result = await validateKbTemplate({
      hotelConfig,
      template: "[[missingRootField]]",
    });

    expect(result.summary).toBe("ISSUES");
    expect(result.missingFromHotelConfig).toEqual(["missingRootField"]);
    expect(result.missingContextualFields).toEqual([]);
  });
});

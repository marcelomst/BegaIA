import { describe, it, expect } from "vitest";
import { toNearbyPointsFromPlaces } from "@/lib/agents/retrieval_based";

describe("places → NearbyPoint mapper", () => {
  it("maps name/description and builds searchQuery with locationHint", () => {
    const places = [
      { name: "Playa Mansa", description: "Beach · Punta del Este" },
    ];
    const out = toNearbyPointsFromPlaces(places, "Punta del Este, UY");
    expect(out).toEqual([
      {
        name: "Playa Mansa",
        description: "Beach · Punta del Este",
        searchQuery: "Playa Mansa Punta del Este, UY",
      },
    ]);
  });
});

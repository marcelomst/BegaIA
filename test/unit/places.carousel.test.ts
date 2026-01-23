import { describe, it, expect } from "vitest";
import { buildNearbyCarouselFromPlaces } from "@/lib/agents/retrieval_based";

describe("places → carousel builder", () => {
  it("keeps only items with photoName and uses proxy url", () => {
    const places = [
      { name: "Playa Mansa", description: "Beach", photoName: "photos/1" },
      { name: "Playa Brava", description: "Waves", photoName: "photos/2" },
      { name: "Sin Foto", description: "No photo" },
      { name: "Puerto", description: "Marina", photoName: "photos/3" },
      { name: "Casapueblo", description: "Museum", photoName: "photos/4" },
      { name: "Isla Gorriti", description: "Island", photoName: "photos/5" },
    ];

    const out = buildNearbyCarouselFromPlaces(places, 5);
    expect(out).toHaveLength(5);
    expect(out[0].images[0].url).toContain("name=photos%2F1");
    expect(out.every((i) => i.images.length === 1)).toBe(true);
  });
});

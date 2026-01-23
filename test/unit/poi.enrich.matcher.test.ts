import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enrichAttractionsWithPlaces } from "@/app/api/hotels/enrich-attractions/route";

vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => ([
    { placeId: "place-123", photoName: "places/abc/photos/def" },
  ])),
}));

describe("POI enrich matcher", () => {
  const originalKey = process.env.GOOGLE_PLACES_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  it("attaches placeId/photoName when Places returns a match", async () => {
    const out = await enrichAttractionsWithPlaces({
      attractions: [{ name: "Playa Mansa" }],
      locationText: "Punta del Este, UY",
      lang: "es",
    });
    expect(out[0]).toEqual(expect.objectContaining({
      placeId: "place-123",
      photoName: "places/abc/photos/def",
    }));
  });
});

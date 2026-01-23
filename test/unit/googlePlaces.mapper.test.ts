import { describe, it, expect } from "vitest";
import { mapPlacesResponse } from "@/lib/media/googlePlaces";

describe("googlePlaces mapper", () => {
  it("maps Places response to normalized shape", () => {
    const data = {
      places: [
        {
          id: "place-123",
          displayName: { text: "Playa Mansa" },
          primaryTypeDisplayName: { text: "Beach" },
          shortFormattedAddress: "Punta del Este, UY",
          googleMapsUri: "https://maps.google.com/?q=Playa+Mansa",
          photos: [{ name: "places/abc/photos/def" }],
        },
      ],
    };
    const out = mapPlacesResponse(data);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      name: "Playa Mansa",
      description: "Beach",
      placeId: "place-123",
      mapsUrl: "https://maps.google.com/?q=Playa+Mansa",
      photoName: "places/abc/photos/def",
    });
  });
});

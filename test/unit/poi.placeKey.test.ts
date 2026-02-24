import { describe, expect, it } from "vitest";
import { buildPlaceKeyFromPoi, extractMapsQuery, normalizePlaceKey } from "@/lib/poi/placeKey";
import type { POIRecord } from "@/types/poi";

describe("placeKey helpers", () => {
  it("extrae q= de mapsUrl y normaliza", () => {
    const poi: Pick<POIRecord, "location" | "name"> = {
      name: "Evento",
      location: { mapsUrl: "https://maps.google.com/?q=Playa+Mansa" },
    };
    const key = buildPlaceKeyFromPoi(poi);
    expect(key).toBe("playa mansa");
    expect(normalizePlaceKey(extractMapsQuery(poi.location?.mapsUrl || "") || "")).toBe("playa mansa");
  });

  it("ignora address descriptivo y usa location.name", () => {
    const poi: Pick<POIRecord, "location" | "name"> = {
      name: "Evento",
      location: {
        address: "Entrada gratis. De 10 a 13 h. Tel 099123456",
        name: "Teatro Nogaro",
      },
    };
    const key = buildPlaceKeyFromPoi(poi);
    expect(key).toBe("teatro nogaro");
  });

  it("limpia teléfono y horarios en poi.name", () => {
    const poi: Pick<POIRecord, "location" | "name"> = {
      name: "Feria artesanal de 10 a 13 h Tel 099 123 456",
    };
    const key = buildPlaceKeyFromPoi(poi);
    expect(key).toBe("feria artesanal");
  });
});
